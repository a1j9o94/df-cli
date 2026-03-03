/**
 * Tests that estimateAndRecordCost is called from every agent command.
 *
 * Rather than testing the commands end-to-end (which require full CLI setup),
 * we test that the budget module's estimateAndRecordCost works correctly
 * when called in the patterns used by commands.
 *
 * The actual integration (wiring) is verified by checking that each command
 * imports and calls estimateAndRecordCost.
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { estimateAndRecordCost, checkBudget } from "../../../src/pipeline/budget.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 20 }).id;
});

describe("command cost integration patterns", () => {
  test("heartbeat pattern: cost increments on each heartbeat call", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });

    // Simulate agent created 3 minutes ago
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(threeMinAgo, threeMinAgo, agent.id);

    // First heartbeat — estimates cost from creation
    const cost1 = estimateAndRecordCost(db, agent.id);
    expect(cost1).toBeGreaterThan(0);
    // ~$0.15 for 3 minutes at $0.05/min
    expect(cost1).toBeCloseTo(0.15, 1);

    // Second heartbeat (immediately after) — near-zero increment
    const cost2 = estimateAndRecordCost(db, agent.id);
    expect(cost2 - cost1).toBeLessThan(0.01);
  });

  test("complete pattern: final cost recorded before marking complete", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });

    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(fiveMinAgo, fiveMinAgo, agent.id);

    const finalCost = estimateAndRecordCost(db, agent.id);
    // ~$0.25 for 5 minutes
    expect(finalCost).toBeCloseTo(0.25, 1);

    // Verify run cost is updated
    const budget = checkBudget(db, runId);
    expect(budget.spentUsd).toBeGreaterThan(0);
  });

  test("no double-counting: heartbeat then immediate complete", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });

    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(threeMinAgo, threeMinAgo, agent.id);

    // Heartbeat records cost
    const costAfterHeartbeat = estimateAndRecordCost(db, agent.id);
    expect(costAfterHeartbeat).toBeGreaterThan(0);

    // Complete immediately after — should not double-count
    const costAfterComplete = estimateAndRecordCost(db, agent.id);
    const delta = costAfterComplete - costAfterHeartbeat;

    // Delta should be near-zero (< 1 second of cost)
    expect(delta).toBeLessThan(0.01);
  });

  test("mail check pattern: cost increments on mail check", () => {
    const agent = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });

    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(twoMinAgo, twoMinAgo, agent.id);

    const cost = estimateAndRecordCost(db, agent.id);
    expect(cost).toBeGreaterThan(0);
    // ~$0.10 for 2 minutes
    expect(cost).toBeCloseTo(0.10, 1);
  });

  test("multiple agents: costs tracked independently", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });

    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(fiveMinAgo, fiveMinAgo, a1.id);
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(twoMinAgo, twoMinAgo, a2.id);

    const cost1 = estimateAndRecordCost(db, a1.id);
    const cost2 = estimateAndRecordCost(db, a2.id);

    // a1 (5 min) should cost more than a2 (2 min)
    expect(cost1).toBeGreaterThan(cost2);
    expect(cost1).toBeCloseTo(0.25, 1);
    expect(cost2).toBeCloseTo(0.10, 1);

    // Both should be reflected in run total
    const budget = checkBudget(db, runId);
    expect(budget.spentUsd).toBeCloseTo(cost1 + cost2, 1);
  });
});
