import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { checkBudget, recordCost, projectCost } from "../../../src/pipeline/budget.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 20 }).id;
});

describe("checkBudget", () => {
  test("returns correct initial budget", () => {
    const status = checkBudget(db, runId);
    expect(status.budgetUsd).toBe(20);
    expect(status.spentUsd).toBe(0);
    expect(status.remainingUsd).toBe(20);
    expect(status.overBudget).toBe(false);
  });

  test("reflects spending", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    recordCost(db, runId, agent.id, 5, 1000);

    const status = checkBudget(db, runId);
    expect(status.spentUsd).toBe(5);
    expect(status.remainingUsd).toBe(15);
    expect(status.overBudget).toBe(false);
  });

  test("detects over-budget", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    recordCost(db, runId, agent.id, 25, 5000);

    const status = checkBudget(db, runId);
    expect(status.overBudget).toBe(true);
  });
});

describe("recordCost", () => {
  test("updates both agent and run cost", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    recordCost(db, runId, agent.id, 3.5, 700);

    const status = checkBudget(db, runId);
    expect(status.spentUsd).toBe(3.5);
  });
});

describe("projectCost", () => {
  test("returns current cost when no agents completed", () => {
    expect(projectCost(db, runId)).toBe(0);
  });

  test("projects based on completed agent costs", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    const a3 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b3", system_prompt: "p" });

    recordCost(db, runId, a1.id, 5, 1000);
    updateAgentStatus(db, a1.id, "completed");
    recordCost(db, runId, a2.id, 3, 600);
    updateAgentStatus(db, a2.id, "completed");
    // a3 is still running

    const projected = projectCost(db, runId);
    // 2 completed agents spent $8 total, avg $4 each, 1 remaining → projected = 8 + 4 = 12
    expect(projected).toBe(12);
  });
});
