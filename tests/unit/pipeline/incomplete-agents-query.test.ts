import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  createAgent,
  updateAgentStatus,
  getIncompleteAgents,
} from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";

let db: SqliteDb;

function createTestSpec(db: SqliteDb) {
  return createSpec(db, `spec_${Date.now()}`, "Test spec", "/tmp/test-spec.md");
}

beforeEach(() => {
  db = getDbForTest();
});

describe("getIncompleteAgents", () => {
  test("returns agents with 'incomplete' status for a run", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete-1",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "incomplete");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete-2",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "incomplete");

    // A completed agent — should NOT appear
    const agent3 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-completed",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent3.id, "completed");

    // A failed agent — should NOT appear
    const agent4 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-failed",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent4.id, "failed");

    const incomplete = getIncompleteAgents(db, run.id);
    expect(incomplete).toHaveLength(2);
    const names = incomplete.map((a) => a.name);
    expect(names).toContain("builder-incomplete-1");
    expect(names).toContain("builder-incomplete-2");
  });

  test("returns empty array when no incomplete agents exist", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-ok",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    const incomplete = getIncompleteAgents(db, run.id);
    expect(incomplete).toHaveLength(0);
  });

  test("only returns incomplete agents for the specified run", () => {
    const spec = createTestSpec(db);
    const run1 = createRun(db, { spec_id: spec.id });
    const run2 = createRun(db, { spec_id: spec.id });

    const a1 = createAgent(db, {
      agent_id: "",
      run_id: run1.id,
      role: "builder",
      name: "builder-run1",
      system_prompt: "test",
    });
    updateAgentStatus(db, a1.id, "incomplete");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: run2.id,
      role: "builder",
      name: "builder-run2",
      system_prompt: "test",
    });
    updateAgentStatus(db, a2.id, "incomplete");

    const run1Incomplete = getIncompleteAgents(db, run1.id);
    expect(run1Incomplete).toHaveLength(1);
    expect(run1Incomplete[0].name).toBe("builder-run1");
  });
});

describe("incomplete agent badge classification", () => {
  test("incomplete is distinct from failed status", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const incompleteAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-amber",
      system_prompt: "test",
    });
    updateAgentStatus(db, incompleteAgent.id, "incomplete");

    const failedAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-red",
      system_prompt: "test",
    });
    updateAgentStatus(db, failedAgent.id, "failed");

    // Verify they have different statuses
    const incomplete = db.prepare("SELECT status FROM agents WHERE id = ?").get(incompleteAgent.id) as { status: string };
    const failed = db.prepare("SELECT status FROM agents WHERE id = ?").get(failedAgent.id) as { status: string };

    expect(incomplete.status).toBe("incomplete");
    expect(failed.status).toBe("failed");
    expect(incomplete.status).not.toBe(failed.status);
  });

  test("getStatusBadge returns amber for incomplete, red for failed", () => {
    // Import the helper
    const { getStatusBadge } = require("../../../src/pipeline/agent-lifecycle.js");

    expect(getStatusBadge("incomplete")).toBe("amber");
    expect(getStatusBadge("failed")).toBe("red");
    expect(getStatusBadge("completed")).toBe("green");
    expect(getStatusBadge("running")).toBe("blue");
    expect(getStatusBadge("pending")).toBe("gray");
  });
});
