import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { checkBudget, recordCost, projectCost, estimateAndRecordCost } from "../../../src/pipeline/budget.js";
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

describe("estimateAndRecordCost", () => {
  test("estimates cost from elapsed time since creation when no heartbeat", () => {
    // Create agent with a created_at 2 minutes in the past
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(twoMinAgo, twoMinAgo, agent.id);

    const newTotal = estimateAndRecordCost(db, agent.id);
    expect(newTotal).toBeGreaterThan(0);

    // At $0.05/min, 2 minutes should be ~$0.10
    expect(newTotal).toBeCloseTo(0.10, 1);
  });

  test("estimates cost from elapsed time since last heartbeat", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    // Set created_at to 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const oneMinAgo = new Date(Date.now() - 1 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, last_heartbeat = ?, updated_at = ? WHERE id = ?")
      .run(tenMinAgo, oneMinAgo, oneMinAgo, agent.id);

    const newTotal = estimateAndRecordCost(db, agent.id);
    // Should estimate from last_heartbeat (1 min ago), not created_at (10 min ago)
    // At $0.05/min, 1 minute = ~$0.05
    expect(newTotal).toBeCloseTo(0.05, 1);
    expect(newTotal).toBeLessThan(0.20); // Definitely less than 10 min estimate
  });

  test("is idempotent for rapid successive calls", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const oneMinAgo = new Date(Date.now() - 1 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(oneMinAgo, oneMinAgo, agent.id);

    const first = estimateAndRecordCost(db, agent.id);
    expect(first).toBeGreaterThan(0);

    // Calling again immediately should add near-zero (time since last update is ~0)
    const second = estimateAndRecordCost(db, agent.id);
    // The second call's delta should be tiny (milliseconds of elapsed time)
    expect(second - first).toBeLessThan(0.01);
  });

  test("returns new total cost for agent", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    // Pre-seed some cost
    recordCost(db, runId, agent.id, 1.0, 100);

    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    // Set created_at to far past, updated_at to 2 min ago (simulating last cost update was 2 min ago)
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(tenMinAgo, twoMinAgo, agent.id);

    const newTotal = estimateAndRecordCost(db, agent.id);
    // Should be previous cost (1.0) + estimated cost (~0.10 for 2 min)
    expect(newTotal).toBeGreaterThan(1.0);
    expect(newTotal).toBeCloseTo(1.10, 1);
  });

  test("updates run cost as well as agent cost", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(twoMinAgo, twoMinAgo, agent.id);

    estimateAndRecordCost(db, agent.id);

    const budget = checkBudget(db, runId);
    expect(budget.spentUsd).toBeGreaterThan(0);
  });

  test("uses cost_per_minute from config with default of 0.05", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(fiveMinAgo, fiveMinAgo, agent.id);

    // With custom cost_per_minute of 0.10
    const newTotal = estimateAndRecordCost(db, agent.id, 0.10);
    // 5 minutes * $0.10/min = $0.50
    expect(newTotal).toBeCloseTo(0.50, 1);
  });

  test("throws if agent not found", () => {
    expect(() => estimateAndRecordCost(db, "nonexistent")).toThrow("Agent not found");
  });
});
