import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  createAgent,
  getAgent,
  updateAgentStatus,
  getActiveAgents,
} from "../../../src/db/queries/agents.js";
import type { SqliteDb } from "../../../src/db/index.js";
import type { AgentStatus } from "../../../src/types/agent.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("AgentStatus includes 'incomplete'", () => {
  test("'incomplete' is a valid AgentStatus value", () => {
    // Type-level check: this assignment must compile without error
    const status: AgentStatus = "incomplete";
    expect(status).toBe("incomplete");
  });

  test("agent can be set to 'incomplete' status in DB", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-incomplete",
      system_prompt: "prompt",
    });

    updateAgentStatus(db, agent.id, "incomplete");
    const updated = getAgent(db, agent.id)!;
    expect(updated.status).toBe("incomplete");
  });

  test("'incomplete' agents are NOT considered active", () => {
    // incomplete means the process exited — it's not actively running
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b-incomplete",
      system_prompt: "p",
    });
    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b-running",
      system_prompt: "p",
    });

    updateAgentStatus(db, a1.id, "incomplete");
    // a2 stays as 'pending' (active)

    const active = getActiveAgents(db, runId);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("b-running");
  });

  test("all valid AgentStatus values are recognized", () => {
    const validStatuses: AgentStatus[] = [
      "pending",
      "spawning",
      "running",
      "completed",
      "failed",
      "killed",
      "incomplete",
    ];
    expect(validStatuses).toHaveLength(7);
    expect(validStatuses).toContain("incomplete");
  });
});
