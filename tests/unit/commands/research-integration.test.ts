import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import {
  createResearchArtifact,
  getResearchArtifact,
  listResearchArtifacts,
} from "../../../src/db/queries/research.js";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join, basename } from "node:path";

let db: SqliteDb;
let runId: string;
let architectId: string;
let builderId: string;

const tmpDir = join(import.meta.dir, "__tmp_integration__");

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test123" }).id;
  const architect = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: "architect",
    name: "integration-architect",
    system_prompt: "test",
  });
  architectId = architect.id;

  const builder = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: "builder",
    name: "integration-builder",
    system_prompt: "test",
    module_id: "payments",
  });
  builderId = builder.id;

  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

describe("Scenario: Architect saves a URL reference", () => {
  test("architect saves text research and it is stored and retrievable", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "Stripe SDK docs",
      type: "text",
      content:
        "https://stripe.com/docs/api Use stripe@14.x, not 13.x — breaking changes in webhook signatures",
    });

    expect(artifact.id).toBeTruthy();
    expect(artifact.label).toBe("Stripe SDK docs");
    expect(artifact.type).toBe("text");

    // Retrieve and verify
    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.content).toContain("stripe@14.x");
  });
});

describe("Scenario: Architect saves a screenshot", () => {
  test("file is copied to research directory and path is stored", () => {
    // Simulate: architect takes a screenshot
    const screenshotPath = join(tmpDir, "screenshot.png");
    writeFileSync(screenshotPath, "fake-png-data-for-test");

    // Simulate: copy to research directory (as add command does)
    const researchDir = join(tmpDir, "research", runId);
    mkdirSync(researchDir, { recursive: true });
    const destPath = join(researchDir, basename(screenshotPath));
    copyFileSync(screenshotPath, destPath);

    // Save the artifact record
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "Reference checkout flow",
      type: "file",
      file_path: destPath,
    });

    expect(artifact.type).toBe("file");
    expect(artifact.file_path).toBe(destPath);

    // Verify the file was actually copied
    expect(existsSync(destPath)).toBe(true);
    expect(readFileSync(destPath, "utf-8")).toBe("fake-png-data-for-test");
  });
});

describe("Scenario: Builder retrieves research by module", () => {
  test("returns only research tagged to the builder's module", () => {
    // Architect saves research for different modules
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "Payment API docs",
      type: "text",
      content: "Use Stripe checkout sessions",
      module_id: "payments",
    });

    createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "Auth strategy",
      type: "text",
      content: "Use JWT with refresh tokens",
      module_id: "auth",
    });

    createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "General architecture",
      type: "text",
      content: "Microservices pattern",
    });

    // Builder queries for their module
    const paymentResearch = listResearchArtifacts(db, runId, {
      module_id: "payments",
    });
    expect(paymentResearch).toHaveLength(1);
    expect(paymentResearch[0].label).toBe("Payment API docs");
    expect(paymentResearch[0].content).toBe("Use Stripe checkout sessions");
  });
});

describe("Scenario: Research persists across agents", () => {
  test("architect saves research, builder can still access it", () => {
    // Architect saves research
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "API design notes",
      type: "text",
      content: "Use REST for external, gRPC for internal",
      module_id: "payments",
    });

    // Simulate: architect process ends, builder starts
    // Both operate on the same DB — in production, same .df/state.db file

    // Builder queries research for their module
    const research = listResearchArtifacts(db, runId, {
      module_id: "payments",
    });
    expect(research).toHaveLength(1);
    expect(research[0].id).toBe(artifact.id);
    expect(research[0].agent_id).toBe(architectId);

    // Builder can also get by ID
    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.label).toBe("API design notes");
  });
});

describe("Scenario: Changeability - search integration", () => {
  test("adding a search wrapper is thin — no storage changes needed", () => {
    // This test validates the architecture: creating research artifacts
    // works via a simple function call, making a search wrapper trivial.
    // A future `dark research search <query>` would just:
    // 1. Call WebSearch
    // 2. Call createResearchArtifact with the results
    // No schema or storage changes needed.

    const searchResults = [
      { label: "Result 1", content: "https://example.com/1" },
      { label: "Result 2", content: "https://example.com/2" },
    ];

    // Simulating what a search wrapper would do
    for (const result of searchResults) {
      createResearchArtifact(db, {
        run_id: runId,
        agent_id: architectId,
        label: result.label,
        type: "text",
        content: result.content,
      });
    }

    const all = listResearchArtifacts(db, runId);
    expect(all).toHaveLength(2);
    expect(all[0].label).toBe("Result 1");
    expect(all[1].label).toBe("Result 2");
  });
});

describe("multiple artifact types in same run", () => {
  test("text and file artifacts coexist", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "API docs",
      type: "text",
      content: "REST endpoint documentation",
    });

    const screenshotPath = join(tmpDir, "flow.png");
    writeFileSync(screenshotPath, "png-data");

    createResearchArtifact(db, {
      run_id: runId,
      agent_id: architectId,
      label: "Flow diagram",
      type: "file",
      file_path: screenshotPath,
    });

    const all = listResearchArtifacts(db, runId);
    expect(all).toHaveLength(2);

    const textArtifact = all.find((a) => a.type === "text");
    const fileArtifact = all.find((a) => a.type === "file");

    expect(textArtifact).toBeDefined();
    expect(textArtifact!.content).toBe("REST endpoint documentation");
    expect(textArtifact!.file_path).toBeNull();

    expect(fileArtifact).toBeDefined();
    expect(fileArtifact!.file_path).toBe(screenshotPath);
    expect(fileArtifact!.content).toBeNull();
  });
});
