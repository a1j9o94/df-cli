import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import {
  createAgent, updateAgentStatus, updateAgentPid,
  updateAgentHeartbeat, updateAgentCost,
} from "../../../../src/db/queries/agents.js";
import {
  listAgentsFiltered, getAgentDetail, getLatestAgentPerModule,
} from "../../../../src/db/queries/agent-queries.js";
import { createEvent } from "../../../../src/db/queries/events.js";
import { createMessage } from "../../../../src/db/queries/messages.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("listAgentsFiltered", () => {
  test("returns all agents when no filters applied", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "a1", system_prompt: "p" });

    const agents = listAgentsFiltered(db, { runId });
    expect(agents).toHaveLength(2);
  });

  test("filters to active agents only (--active)", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    const a3 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b3", system_prompt: "p" });

    updateAgentStatus(db, a1.id, "completed");
    updateAgentStatus(db, a3.id, "failed");

    const active = listAgentsFiltered(db, { runId, active: true });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("b2");
  });

  test("filters by module_id (--module)", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });

    const results = listAgentsFiltered(db, { runId, moduleId: "parser" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("b-parser");
  });

  test("filters by role", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "a1", system_prompt: "p" });

    const builders = listAgentsFiltered(db, { runId, role: "builder" });
    expect(builders).toHaveLength(1);
    expect(builders[0].role).toBe("builder");
  });

  test("combines filters: active + role", () => {
    const b1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "a1", system_prompt: "p" });

    updateAgentStatus(db, b1.id, "completed");

    const activeBuilders = listAgentsFiltered(db, { runId, active: true, role: "builder" });
    expect(activeBuilders).toHaveLength(1);
    expect(activeBuilders[0].name).toBe("b2");
  });
});

describe("getLatestAgentPerModule", () => {
  test("returns only the latest agent per module_id", () => {
    // Simulate retry: two agents for same module
    const old = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser-v1", module_id: "parser", system_prompt: "p" });
    updateAgentStatus(db, old.id, "failed");

    const newer = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser-v2", module_id: "parser", system_prompt: "p" });

    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });

    const latest = getLatestAgentPerModule(db, runId);
    expect(latest).toHaveLength(2); // one for parser, one for lexer

    const parserAgent = latest.find(a => a.module_id === "parser");
    expect(parserAgent?.name).toBe("b-parser-v2");
  });

  test("includes agents without module_id", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "orchestrator", name: "orch", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", module_id: "parser", system_prompt: "p" });

    const latest = getLatestAgentPerModule(db, runId);
    expect(latest).toHaveLength(2);
  });
});

describe("getAgentDetail", () => {
  test("returns null for non-existent agent", () => {
    const detail = getAgentDetail(db, "nonexistent");
    expect(detail).toBeNull();
  });

  test("returns agent with enriched data", () => {
    const agent = createAgent(db, {
      agent_id: "", run_id: runId, role: "builder", name: "b1",
      module_id: "parser", worktree_path: "/tmp/parser-abc",
      system_prompt: "Build the parser.",
    });
    updateAgentPid(db, agent.id, 12345);
    updateAgentHeartbeat(db, agent.id);
    updateAgentCost(db, agent.id, 0.62, 5000);

    const detail = getAgentDetail(db, agent.id);
    expect(detail).not.toBeNull();
    expect(detail!.agent.id).toBe(agent.id);
    expect(detail!.agent.name).toBe("b1");
    expect(detail!.agent.module_id).toBe("parser");
    expect(detail!.agent.worktree_path).toBe("/tmp/parser-abc");
    expect(detail!.agent.cost_usd).toBe(0.62);
    expect(detail!.agent.pid).toBe(12345);
  });

  test("includes recent events for the agent", () => {
    const agent = createAgent(db, {
      agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p",
    });

    createEvent(db, runId, "agent-spawned", { module: "parser" }, agent.id);
    createEvent(db, runId, "agent-heartbeat", {}, agent.id);

    const detail = getAgentDetail(db, agent.id);
    expect(detail!.events).toHaveLength(2);
    expect(detail!.events[0].type).toBe("agent-heartbeat"); // DESC order
    expect(detail!.events[1].type).toBe("agent-spawned");
  });

  test("includes recent messages to the agent", () => {
    const agent = createAgent(db, {
      agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p",
    });
    const sender = createAgent(db, {
      agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p",
    });

    createMessage(db, runId, sender.id, "Your contract is ready", { toAgentId: agent.id });
    createMessage(db, runId, sender.id, "Update: contract v2", { toAgentId: agent.id });

    const detail = getAgentDetail(db, agent.id);
    expect(detail!.messages).toHaveLength(2);
  });
});
