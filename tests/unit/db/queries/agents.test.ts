import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import {
  createAgent, getAgent, listAgents,
  updateAgentStatus, updateAgentPid, updateAgentHeartbeat,
  updateAgentCost, updateAgentTdd, getActiveAgents,
} from "../../../../src/db/queries/agents.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("agents queries", () => {
  test("createAgent inserts and returns an agent", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: "You are a builder.",
    });
    expect(agent.id).toMatch(/^agt_/);
    expect(agent.run_id).toBe(runId);
    expect(agent.role).toBe("builder");
    expect(agent.status).toBe("pending");
    expect(agent.cost_usd).toBe(0);
  });

  test("createAgent with module_id", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-2",
      module_id: "parser",
      system_prompt: "prompt",
    });
    expect(agent.module_id).toBe("parser");
  });

  test("getAgent returns null for missing", () => {
    expect(getAgent(db, "nonexistent")).toBeNull();
  });

  test("listAgents with filters", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "a1", system_prompt: "p" });

    expect(listAgents(db)).toHaveLength(2);
    expect(listAgents(db, runId)).toHaveLength(2);
    expect(listAgents(db, runId, "builder")).toHaveLength(1);
    expect(listAgents(db, undefined, "architect")).toHaveLength(1);
  });

  test("updateAgentStatus changes status", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentStatus(db, agent.id, "failed", "timeout");
    const updated = getAgent(db, agent.id)!;
    expect(updated.status).toBe("failed");
    expect(updated.error).toBe("timeout");
  });

  test("updateAgentPid sets pid and status to running", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentPid(db, agent.id, 12345);
    const updated = getAgent(db, agent.id)!;
    expect(updated.pid).toBe(12345);
    expect(updated.status).toBe("running");
  });

  test("updateAgentHeartbeat sets timestamp", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentHeartbeat(db, agent.id);
    expect(getAgent(db, agent.id)!.last_heartbeat).toBeTruthy();
  });

  test("updateAgentCost accumulates", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentCost(db, agent.id, 1.0, 500);
    updateAgentCost(db, agent.id, 0.5, 250);
    const updated = getAgent(db, agent.id)!;
    expect(updated.cost_usd).toBe(1.5);
    expect(updated.tokens_used).toBe(750);
  });

  test("updateAgentTdd sets phase and cycles", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentTdd(db, agent.id, "green", 3);
    const updated = getAgent(db, agent.id)!;
    expect(updated.tdd_phase).toBe("green");
    expect(updated.tdd_cycles).toBe(3);
  });

  test("getActiveAgents returns pending/spawning/running agents", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    updateAgentStatus(db, a1.id, "completed");

    const active = getActiveAgents(db, runId);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("b2");
  });
});
