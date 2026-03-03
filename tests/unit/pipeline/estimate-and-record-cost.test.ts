import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { estimateAndRecordCost } from "../../../src/pipeline/budget.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 50 }).id;
});

describe("estimateAndRecordCost", () => {
  test("estimates cost from elapsed time since creation when no heartbeat", () => {
    // Create an agent with a created_at 2 minutes ago
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Manually set created_at to 2 minutes ago
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(twoMinAgo, twoMinAgo, agent.id);

    const newCost = estimateAndRecordCost(db, agent.id);

    // Cost should be > 0 (roughly 2 min * $0.05/min = $0.10)
    expect(newCost).toBeGreaterThan(0);
    expect(newCost).toBeLessThan(1); // sanity bound

    // Verify agent cost was updated
    const updated = getAgent(db, agent.id)!;
    expect(updated.cost_usd).toBeGreaterThan(0);
  });

  test("estimates cost from elapsed time since last heartbeat", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at to 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ? WHERE id = ?").run(fiveMinAgo, agent.id);

    // Set last_heartbeat to 1 minute ago
    const oneMinAgo = new Date(Date.now() - 1 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET last_heartbeat = ?, updated_at = ? WHERE id = ?").run(oneMinAgo, oneMinAgo, agent.id);

    const newCost = estimateAndRecordCost(db, agent.id);

    // Should estimate from last heartbeat (1 min), not from creation (5 min)
    // 1 min * $0.05/min = $0.05
    expect(newCost).toBeGreaterThan(0.01);
    expect(newCost).toBeLessThan(0.20); // generous bound for ~1 min
  });

  test("is idempotent for rapid successive calls", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at to 2 minutes ago
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(twoMinAgo, twoMinAgo, agent.id);

    const cost1 = estimateAndRecordCost(db, agent.id);
    // Call again immediately
    const cost2 = estimateAndRecordCost(db, agent.id);

    // The second call should add very little (near-zero elapsed since first call updated updated_at)
    // Total cost should not double
    const finalAgent = getAgent(db, agent.id)!;
    expect(finalAgent.cost_usd).toBeLessThan(cost1 * 2 + 0.02);
  });

  test("uses cost_per_minute default of 0.05", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at to exactly 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(tenMinAgo, tenMinAgo, agent.id);

    const newCost = estimateAndRecordCost(db, agent.id);

    // 10 min * $0.05/min = $0.50
    expect(newCost).toBeCloseTo(0.50, 1);
  });

  test("returns the new total cost for the agent", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at to 3 minutes ago
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(threeMinAgo, threeMinAgo, agent.id);

    const result = estimateAndRecordCost(db, agent.id);

    const updatedAgent = getAgent(db, agent.id)!;
    expect(result).toBe(updatedAgent.cost_usd);
  });

  test("also updates run cost", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(twoMinAgo, twoMinAgo, agent.id);

    estimateAndRecordCost(db, agent.id);

    const run = db.prepare("SELECT cost_usd FROM runs WHERE id = ?").get(runId) as { cost_usd: number };
    expect(run.cost_usd).toBeGreaterThan(0);
  });

  test("throws if agent not found", () => {
    expect(() => estimateAndRecordCost(db, "nonexistent-agent")).toThrow();
  });

  test("no double-counting: heartbeat then immediate complete", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at to 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(fiveMinAgo, fiveMinAgo, agent.id);

    // First call (like heartbeat) — estimates for 5 min
    const cost1 = estimateAndRecordCost(db, agent.id);

    // Second call immediately (like complete) — should add ~0
    const cost2 = estimateAndRecordCost(db, agent.id);

    const finalAgent = getAgent(db, agent.id)!;
    // Total should not be ~2x the 5-minute estimate
    expect(finalAgent.cost_usd).toBeLessThan(cost1 + 0.02);
  });
});
