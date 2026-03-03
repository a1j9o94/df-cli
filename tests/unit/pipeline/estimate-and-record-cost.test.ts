import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { estimateAndRecordCost } from "../../../src/pipeline/budget.js";
import { checkBudget } from "../../../src/pipeline/budget.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Helper to create an agent with a specific created_at timestamp */
function createAgentAt(db: SqliteDb, runId: string, name: string, createdAt: string) {
  const agent = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: "builder",
    name,
    system_prompt: "test",
  });
  // Backdate the created_at
  db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(createdAt, createdAt, agent.id);
  return getAgent(db, agent.id)!;
}

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 50 }).id;
});

describe("estimateAndRecordCost", () => {
  test("is exported from budget.ts", () => {
    expect(typeof estimateAndRecordCost).toBe("function");
  });

  test("estimates cost based on time since creation when no heartbeat", () => {
    // Agent created 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgentAt(db, runId, "b1", tenMinAgo);

    const totalCost = estimateAndRecordCost(db, agent.id);

    // 10 minutes * $0.05/min = $0.50
    expect(totalCost).toBeGreaterThan(0.4);
    expect(totalCost).toBeLessThan(0.6);
  });

  test("uses last_heartbeat as base time when available", () => {
    // Agent created 20 minutes ago, heartbeat 5 minutes ago
    const twentyMinAgo = new Date(Date.now() - 20 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");

    const agent = createAgentAt(db, runId, "b1", twentyMinAgo);
    db.prepare("UPDATE agents SET last_heartbeat = ? WHERE id = ?").run(fiveMinAgo, agent.id);

    const totalCost = estimateAndRecordCost(db, agent.id);

    // Should use last_heartbeat (5 min ago), not created_at (20 min ago)
    // 5 minutes * $0.05/min = $0.25
    expect(totalCost).toBeGreaterThan(0.2);
    expect(totalCost).toBeLessThan(0.35);
  });

  test("is idempotent for rapid successive calls", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgentAt(db, runId, "b1", fiveMinAgo);

    const cost1 = estimateAndRecordCost(db, agent.id);
    const cost2 = estimateAndRecordCost(db, agent.id);

    // Second call should add at most the minimum ($0.01), not re-estimate from creation
    // The key property: it doesn't double-count the same time period
    expect(cost2).toBeGreaterThanOrEqual(cost1);
    expect(cost2 - cost1).toBeLessThan(0.02); // At most ~$0.01 minimum (with floating-point tolerance)
  });

  test("returns the new total cost for the agent", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgentAt(db, runId, "b1", tenMinAgo);

    const totalCost = estimateAndRecordCost(db, agent.id);

    // Verify the agent's cost in DB matches the returned value
    const updatedAgent = getAgent(db, agent.id)!;
    expect(updatedAgent.cost_usd).toBeCloseTo(totalCost, 2);
  });

  test("updates run cost as well", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgentAt(db, runId, "b1", tenMinAgo);

    estimateAndRecordCost(db, agent.id);

    const budget = checkBudget(db, runId);
    expect(budget.spentUsd).toBeGreaterThan(0);
  });

  test("throws if agent not found", () => {
    expect(() => estimateAndRecordCost(db, "agt_nonexistent")).toThrow();
  });

  test("uses updated_at as fallback base time", () => {
    // Agent created 15 minutes ago, updated 3 minutes ago (no heartbeat)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");

    const agent = createAgentAt(db, runId, "b1", fifteenMinAgo);
    db.prepare("UPDATE agents SET updated_at = ? WHERE id = ?").run(threeMinAgo, agent.id);

    const totalCost = estimateAndRecordCost(db, agent.id);

    // Should use updated_at (3 min ago), not created_at (15 min ago)
    // 3 minutes * $0.05/min = $0.15
    expect(totalCost).toBeGreaterThan(0.1);
    expect(totalCost).toBeLessThan(0.25);
  });

  test("returns near-zero cost for freshly created agent", () => {
    // Agent just created moments ago — cost should be proportional to elapsed time
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "test",
    });

    const totalCost = estimateAndRecordCost(db, agent.id);
    // Freshly created agent: elapsed time is milliseconds, cost should be near zero
    expect(totalCost).toBeGreaterThanOrEqual(0);
    expect(totalCost).toBeLessThan(0.01);
  });
});
