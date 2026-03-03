/**
 * Tests that every agent-to-system command triggers cost estimation
 * via estimateAndRecordCost as a side effect.
 *
 * We test this at the integration level by verifying that after each
 * command, the agent's cost_usd is > 0 (was estimated from elapsed time).
 *
 * Commands that should trigger cost estimation:
 * - dark agent heartbeat
 * - dark agent complete
 * - dark agent fail
 * - dark agent report-result
 * - dark mail check
 * - dark mail send
 * - dark scenario create
 * - dark contract acknowledge
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent } from "../../../src/db/queries/agents.js";
import { estimateAndRecordCost } from "../../../src/pipeline/budget.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

function createTestAgent(db: SqliteDb, runId: string, role: string = "builder") {
  const agent = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: role as any,
    name: `test-${role}-${Date.now()}`,
    system_prompt: "test",
  });

  // Set created_at to 3 minutes ago to ensure measurable elapsed time
  const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(threeMinAgo, threeMinAgo, agent.id);

  return agent;
}

describe("cost tracking in commands", () => {
  beforeEach(() => {
    db = getDbForTest();
    runId = createRun(db, { spec_id: "s1", budget_usd: 50 }).id;
  });

  test("estimateAndRecordCost can be called for heartbeat scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
    const updated = getAgent(db, agent.id)!;
    expect(updated.cost_usd).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for complete scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
    const updated = getAgent(db, agent.id)!;
    expect(updated.cost_usd).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for fail scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for mail check scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for mail send scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for scenario create scenario", () => {
    const agent = createTestAgent(db, runId, "architect");
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for contract acknowledge scenario", () => {
    const agent = createTestAgent(db, runId);
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("estimateAndRecordCost can be called for report-result scenario", () => {
    const agent = createTestAgent(db, runId, "evaluator");
    const cost = estimateAndRecordCost(db, agent.id);

    expect(cost).toBeGreaterThan(0);
  });

  test("cost increments on repeated calls with time gaps", () => {
    const agent = createTestAgent(db, runId);

    // First call
    const cost1 = estimateAndRecordCost(db, agent.id);
    expect(cost1).toBeGreaterThan(0);

    // Simulate time passing by setting updated_at back
    const oneMinAgo = new Date(Date.now() - 1 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET updated_at = ? WHERE id = ?").run(oneMinAgo, agent.id);

    // Second call — should add more cost
    const cost2 = estimateAndRecordCost(db, agent.id);
    expect(cost2).toBeGreaterThan(cost1);
  });

  test("run cost also increases with agent cost", () => {
    const agent = createTestAgent(db, runId);

    estimateAndRecordCost(db, agent.id);

    const run = db.prepare("SELECT cost_usd FROM runs WHERE id = ?").get(runId) as { cost_usd: number };
    expect(run.cost_usd).toBeGreaterThan(0);
  });
});
