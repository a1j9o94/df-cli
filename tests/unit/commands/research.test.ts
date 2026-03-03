import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import {
  createResearchArtifact,
  getResearchArtifact,
  listResearchArtifacts,
} from "../../../src/db/queries/research.js";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

let db: SqliteDb;
let runId: string;
let agentId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  const agent = createAgent(db, {
    run_id: runId,
    role: "architect",
    name: "test-architect",
    system_prompt: "test",
  });
  agentId = agent.id;
});

describe("research add (text content)", () => {
  test("saves text content as a research artifact", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Stripe SDK docs",
      type: "text",
      content: "https://stripe.com/docs/api Use stripe@14.x, not 13.x",
    });

    expect(artifact.id).toBeTruthy();
    expect(artifact.label).toBe("Stripe SDK docs");
    expect(artifact.type).toBe("text");
    expect(artifact.content).toBe("https://stripe.com/docs/api Use stripe@14.x, not 13.x");
    expect(artifact.file_path).toBeNull();
  });

  test("saves text content with module tag", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Payment docs",
      type: "text",
      content: "Stripe checkout session API",
      module_id: "payments",
    });

    expect(artifact.module_id).toBe("payments");
  });
});

describe("research add (file)", () => {
  const tmpDir = join(import.meta.dir, "__tmp_research_test__");

  beforeEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  test("saves a file reference as a research artifact", () => {
    // Create a temporary test file
    const testFile = join(tmpDir, "screenshot.png");
    writeFileSync(testFile, "fake-png-data");

    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Reference checkout flow",
      type: "file",
      file_path: testFile,
    });

    expect(artifact.type).toBe("file");
    expect(artifact.file_path).toBe(testFile);
    expect(artifact.content).toBeNull();

    // Cleanup
    rmSync(tmpDir, { recursive: true });
  });
});

describe("research list", () => {
  test("lists all research artifacts for a run", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Finding A",
      type: "text",
      content: "a",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Finding B",
      type: "text",
      content: "b",
    });

    const list = listResearchArtifacts(db, runId);
    expect(list).toHaveLength(2);
    expect(list[0].label).toBe("Finding A");
    expect(list[1].label).toBe("Finding B");
  });

  test("filters by module", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Payment finding",
      type: "text",
      content: "x",
      module_id: "payments",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Auth finding",
      type: "text",
      content: "y",
      module_id: "auth",
    });

    const paymentOnly = listResearchArtifacts(db, runId, { module_id: "payments" });
    expect(paymentOnly).toHaveLength(1);
    expect(paymentOnly[0].label).toBe("Payment finding");
  });

  test("returns empty for run with no research", () => {
    const run2 = createRun(db, { spec_id: "s2" });
    expect(listResearchArtifacts(db, run2.id)).toHaveLength(0);
  });
});

describe("research show", () => {
  test("retrieves a specific research artifact by id", () => {
    const created = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Important finding",
      type: "text",
      content: "This is critical information about the API",
    });

    const fetched = getResearchArtifact(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.label).toBe("Important finding");
    expect(fetched!.content).toBe("This is critical information about the API");
  });

  test("returns null for non-existent research id", () => {
    const fetched = getResearchArtifact(db, "rsch_NONEXISTENT");
    expect(fetched).toBeNull();
  });
});

describe("research persistence across agents", () => {
  test("research saved by one agent is accessible by another", () => {
    // Architect saves research
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "API design notes",
      type: "text",
      content: "Use REST, not GraphQL",
      module_id: "api",
    });

    // Builder agent (different agent) queries research
    const builder = createAgent(db, {
      run_id: runId,
      role: "builder",
      name: "test-builder",
      system_prompt: "test",
    });

    // Builder can see research for the run filtered by module
    const apiResearch = listResearchArtifacts(db, runId, { module_id: "api" });
    expect(apiResearch).toHaveLength(1);
    expect(apiResearch[0].label).toBe("API design notes");
    expect(apiResearch[0].agent_id).toBe(agentId); // created by architect
  });
});
