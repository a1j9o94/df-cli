import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import type { SqliteDb } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent } from "../../../../src/db/queries/agents.js";
import {
  createResearchArtifact,
  getResearchArtifact,
  listResearchArtifacts,
} from "../../../../src/db/queries/research.js";
import { newResearchId } from "../../../../src/utils/id.js";

let db: SqliteDb;
let runId: string;
let agentId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  const agent = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: "architect",
    name: "test-architect",
    system_prompt: "test",
  });
  agentId = agent.id;
});

describe("research_artifacts schema", () => {
  test("research_artifacts table exists in schema", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='research_artifacts'"
      )
      .all();
    expect(tables).toHaveLength(1);
  });
});

describe("newResearchId", () => {
  test("generates ids with res_ prefix", () => {
    const id = newResearchId();
    expect(id).toMatch(/^rsch_/);
  });

  test("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 10 }, () => newResearchId()));
    expect(ids.size).toBe(10);
  });
});

describe("createResearchArtifact", () => {
  test("creates a text research artifact", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Stripe SDK docs",
      type: "text",
      content: "https://stripe.com/docs/api Use stripe@14.x",
    });

    expect(artifact.id).toMatch(/^rsch_/);
    expect(artifact.run_id).toBe(runId);
    expect(artifact.agent_id).toBe(agentId);
    expect(artifact.label).toBe("Stripe SDK docs");
    expect(artifact.type).toBe("text");
    expect(artifact.content).toBe(
      "https://stripe.com/docs/api Use stripe@14.x"
    );
    expect(artifact.file_path).toBeNull();
    expect(artifact.module_id).toBeNull();
    expect(artifact.created_at).toBeTruthy();
  });

  test("creates a file research artifact", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Reference checkout flow",
      type: "file",
      file_path: ".df/research/run_123/screenshot.png",
    });

    expect(artifact.type).toBe("file");
    expect(artifact.file_path).toBe(".df/research/run_123/screenshot.png");
    expect(artifact.content).toBeNull();
  });

  test("creates artifact with module_id tag", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Payment API reference",
      type: "text",
      content: "Use stripe checkout session",
      module_id: "payments",
    });

    expect(artifact.module_id).toBe("payments");
  });
});

describe("getResearchArtifact", () => {
  test("retrieves an artifact by id", () => {
    const created = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Test",
      type: "text",
      content: "test content",
    });

    const fetched = getResearchArtifact(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.label).toBe("Test");
  });

  test("returns null for non-existent id", () => {
    expect(getResearchArtifact(db, "res_NONEXISTENT")).toBeNull();
  });
});

describe("listResearchArtifacts", () => {
  test("lists all artifacts for a run", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "A",
      type: "text",
      content: "content A",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "B",
      type: "text",
      content: "content B",
    });

    const list = listResearchArtifacts(db, runId);
    expect(list).toHaveLength(2);
  });

  test("filters by module_id", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "A",
      type: "text",
      content: "a",
      module_id: "payments",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "B",
      type: "text",
      content: "b",
      module_id: "auth",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "C",
      type: "text",
      content: "c",
    });

    const paymentItems = listResearchArtifacts(db, runId, {
      module_id: "payments",
    });
    expect(paymentItems).toHaveLength(1);
    expect(paymentItems[0].label).toBe("A");
  });

  test("filters by agent_id", () => {
    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "test-builder",
      system_prompt: "test",
    });

    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Architect finding",
      type: "text",
      content: "x",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agent2.id,
      label: "Builder finding",
      type: "text",
      content: "y",
    });

    const architectOnly = listResearchArtifacts(db, runId, {
      agent_id: agentId,
    });
    expect(architectOnly).toHaveLength(1);
    expect(architectOnly[0].label).toBe("Architect finding");
  });

  test("returns empty array for run with no research", () => {
    const run2 = createRun(db, { spec_id: "s2" });
    expect(listResearchArtifacts(db, run2.id)).toHaveLength(0);
  });

  test("orders by created_at ascending", () => {
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "First",
      type: "text",
      content: "1",
    });
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Second",
      type: "text",
      content: "2",
    });

    const list = listResearchArtifacts(db, runId);
    expect(list[0].label).toBe("First");
    expect(list[1].label).toBe("Second");
  });
});
