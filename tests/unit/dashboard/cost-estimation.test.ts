import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { computeElapsedMs, estimateCost } from "../../../src/utils/agent-enrichment.js";

/**
 * Cost Estimation Tests for Dashboard Polling
 *
 * Spec: Dashboard polls trigger cost estimation for running agents
 * Module: mod-server-cost-estimation
 *
 * These tests verify that when the dashboard polls the server,
 * running agents get estimated costs based on elapsed time,
 * while completed/pending agents do not.
 */

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Seed a run with agents in various states for cost estimation testing.
 * - 1 completed agent (cost_usd=0.50, created 15min ago)
 * - 1 running agent (cost_usd=0, created 5min ago) -> should get estimated cost
 * - 1 pending agent (cost_usd=0) -> should NOT get estimated cost
 */
function seedCostEstimationData(db: InstanceType<typeof Database>) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Create a running run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_cost",
    "spec_cost",
    "running",
    0,
    4,
    50.0,
    0.5, // only completed agent's cost counts
    50000,
    "build",
    1,
    3,
    "{}",
    fifteenMinAgo,
    now,
  );

  // Completed agent with real cost
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_completed",
    "run_cost",
    "builder",
    "builder-completed",
    "completed",
    null,
    "mod-done",
    null,
    null,
    5,
    0.5,
    30000,
    0,
    300000,
    null,
    fifteenMinAgo,
    new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  );

  // Running agent with zero cost (should get estimated cost)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_running",
    "run_cost",
    "builder",
    "builder-running",
    "running",
    1234,
    "mod-active",
    null,
    "green",
    3,
    0, // zero cost -> should be estimated
    0,
    0,
    0,
    null,
    fiveMinAgo,
    now,
  );

  // Pending agent with zero cost (should NOT get estimated cost)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_pending",
    "run_cost",
    "builder",
    "builder-pending",
    "pending",
    null,
    "mod-waiting",
    null,
    null,
    0,
    0,
    0,
    0,
    0,
    null,
    now,
    now,
  );
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("Poll returns estimated cost for running agents", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedCostEstimationData(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("running agent with cost_usd=0 gets estimatedCost > 0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_cost/agents`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const running = data.find((a: Record<string, unknown>) => a.id === "agt_running");

    expect(running).toBeDefined();
    expect(running.status).toBe("running");
    expect(running.cost).toBe(0);
    expect(running.estimatedCost).toBeGreaterThan(0);
    expect(running.isEstimate).toBe(true);
  });

  test("running agent estimated cost approximates 5min * $0.05/min", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_cost/agents`);
    const data = await res.json();
    const running = data.find((a: Record<string, unknown>) => a.id === "agt_running");

    // 5 minutes * $0.05/min = $0.25, allow some tolerance for test timing
    expect(running.estimatedCost).toBeGreaterThan(0.2);
    expect(running.estimatedCost).toBeLessThan(0.35);
  });

  test("completed agent with real cost has estimatedCost=0 and isEstimate=false", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_cost/agents`);
    const data = await res.json();
    const completed = data.find((a: Record<string, unknown>) => a.id === "agt_completed");

    expect(completed).toBeDefined();
    expect(completed.status).toBe("completed");
    expect(completed.cost).toBe(0.5);
    expect(completed.estimatedCost).toBe(0);
    expect(completed.isEstimate).toBe(false);
  });

  test("pending agent has estimatedCost=0 and isEstimate=false", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_cost/agents`);
    const data = await res.json();
    const pending = data.find((a: Record<string, unknown>) => a.id === "agt_pending");

    expect(pending).toBeDefined();
    expect(pending.status).toBe("pending");
    expect(pending.cost).toBe(0);
    expect(pending.estimatedCost).toBe(0);
    expect(pending.isEstimate).toBe(false);
  });

  test("all agents have estimatedCost and isEstimate fields", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_cost/agents`);
    const data = await res.json();

    for (const agent of data) {
      expect(typeof agent.estimatedCost).toBe("number");
      expect(typeof agent.isEstimate).toBe("boolean");
    }
  });
});

describe("Cost estimates update on successive polls", () => {
  beforeEach(async () => {
    db = createTestDb();
    // Create a run with a running agent created very recently
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_poll",
      "spec_poll",
      "running",
      0,
      4,
      50.0,
      0,
      0,
      "build",
      1,
      3,
      "{}",
      now,
      now,
    );

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_poll",
      "run_poll",
      "builder",
      "builder-poll",
      "running",
      5555,
      "mod-poll",
      null,
      "red",
      1,
      0,
      0,
      0,
      0,
      null,
      now,
      now,
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("successive polls return increasing estimatedCost for running agents", async () => {
    // First poll
    const res1 = await fetch(`${server?.url}/api/runs/run_poll/agents`);
    const data1 = await res1.json();
    const agent1 = data1.find((a: Record<string, unknown>) => a.id === "agt_poll");
    const e1 = agent1.estimatedCost as number;

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second poll
    const res2 = await fetch(`${server?.url}/api/runs/run_poll/agents`);
    const data2 = await res2.json();
    const agent2 = data2.find((a: Record<string, unknown>) => a.id === "agt_poll");
    const e2 = agent2.estimatedCost as number;

    // E2 should be greater than E1
    expect(e2).toBeGreaterThan(e1);
  });
});

describe("Run summary includes aggregated estimated cost", () => {
  beforeEach(async () => {
    db = createTestDb();
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Create a run with budget=50, cost=1.0
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_agg",
      "spec_agg",
      "running",
      0,
      4,
      50.0,
      1.0,
      50000,
      "build",
      1,
      3,
      "{}",
      threeMinAgo,
      now,
    );

    // 2 running agents with cost=0, created 3 min ago
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_r1",
      "run_agg",
      "builder",
      "builder-r1",
      "running",
      1111,
      "mod-x",
      null,
      "green",
      2,
      0,
      0,
      0,
      0,
      null,
      threeMinAgo,
      now,
    );

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_r2",
      "run_agg",
      "builder",
      "builder-r2",
      "running",
      2222,
      "mod-y",
      null,
      "red",
      1,
      0,
      0,
      0,
      0,
      null,
      threeMinAgo,
      now,
    );

    // 1 completed agent with cost=1.0
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_c1",
      "run_agg",
      "builder",
      "builder-c1",
      "completed",
      null,
      "mod-z",
      null,
      null,
      4,
      1.0,
      30000,
      0,
      120000,
      null,
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("RunSummary.estimatedCost > 0 when running agents exist", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_agg`);
    const data = await res.json();

    expect(typeof data.estimatedCost).toBe("number");
    expect(data.estimatedCost).toBeGreaterThan(0);
  });

  test("RunSummary.estimatedCost equals sum of per-agent estimates", async () => {
    // Get run summary
    const runRes = await fetch(`${server?.url}/api/runs/run_agg`);
    const runData = await runRes.json();

    // Get individual agents
    const agentsRes = await fetch(`${server?.url}/api/runs/run_agg/agents`);
    const agentsData = await agentsRes.json();

    // Sum individual agent estimates
    let sumEstimates = 0;
    for (const agent of agentsData) {
      sumEstimates += agent.estimatedCost as number;
    }

    // Run's estimated cost should match the sum (within small timing tolerance)
    expect(Math.abs(runData.estimatedCost - sumEstimates)).toBeLessThan(0.01);
  });

  test("RunSummary estimated cost approximates 2 agents * 3min * $0.05/min", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_agg`);
    const data = await res.json();

    // 2 running agents * 3 min * $0.05/min = $0.30
    // Allow some tolerance for timing
    expect(data.estimatedCost).toBeGreaterThan(0.2);
    expect(data.estimatedCost).toBeLessThan(0.45);
  });
});

describe("Budget progress reflects estimated costs", () => {
  beforeEach(async () => {
    db = createTestDb();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Run with budget=10.0, cost=4.0
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_budget",
      "spec_budget",
      "running",
      0,
      4,
      10.0,
      4.0,
      80000,
      "build",
      1,
      3,
      "{}",
      tenMinAgo,
      now,
    );

    // 2 running agents, created 10min ago, cost=0 -> each ~$0.50 estimated
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_b1",
      "run_budget",
      "builder",
      "builder-b1",
      "running",
      3333,
      "mod-1",
      null,
      "green",
      2,
      0,
      0,
      0,
      0,
      null,
      tenMinAgo,
      now,
    );

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_b2",
      "run_budget",
      "builder",
      "builder-b2",
      "running",
      4444,
      "mod-2",
      null,
      "red",
      1,
      0,
      0,
      0,
      0,
      null,
      tenMinAgo,
      now,
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("API returns cost and estimatedCost for budget calculation", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_budget`);
    const data = await res.json();

    expect(data.cost).toBe(4.0);
    expect(data.estimatedCost).toBeGreaterThan(0);
    expect(data.budget).toBe(10.0);

    // Total cost (actual + estimated) should account for both
    const totalCost = data.cost + data.estimatedCost;
    expect(totalCost).toBeGreaterThan(4.0);

    // Budget percentage should be (cost + estimatedCost) / budget * 100
    const budgetPct = (totalCost / data.budget) * 100;
    // With 2 agents * 10 min * $0.05/min = ~$1.0 estimated, total ~$5.0 = ~50%
    expect(budgetPct).toBeGreaterThan(40);
    expect(budgetPct).toBeLessThan(65);
  });

  test("estimated cost approximates 2 agents * 10min * $0.05/min", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_budget`);
    const data = await res.json();

    // 2 running agents * 10 min * $0.05/min = $1.00
    expect(data.estimatedCost).toBeGreaterThan(0.8);
    expect(data.estimatedCost).toBeLessThan(1.25);
  });
});

describe("Estimate transitions to real cost", () => {
  let testDb: InstanceType<typeof Database>;
  let testServer: { port: number; url: string; stop: () => void } | null = null;

  beforeEach(async () => {
    testDb = createTestDb();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Create run
    testDb
      .prepare(
        `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "run_trans",
        "spec_trans",
        "running",
        0,
        4,
        50.0,
        0,
        0,
        "build",
        1,
        3,
        "{}",
        fiveMinAgo,
        now,
      );

    // Running agent with no cost yet
    testDb
      .prepare(
        `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "agt_trans",
        "run_trans",
        "builder",
        "builder-trans",
        "running",
        6666,
        "mod-trans",
        null,
        "green",
        3,
        0,
        0,
        0,
        0,
        null,
        fiveMinAgo,
        now,
      );

    testServer = await startServer({ port: 0, db: testDb });
  });

  afterEach(() => {
    if (testServer) {
      testServer.stop();
      testServer = null;
    }
    testDb.close();
  });

  test("running agent initially shows estimate, then shows real cost after completion", async () => {
    // First poll: agent is running with estimate
    const res1 = await fetch(`${testServer?.url}/api/runs/run_trans/agents`);
    const data1 = await res1.json();
    const agent1 = data1.find((a: Record<string, unknown>) => a.id === "agt_trans");

    expect(agent1.isEstimate).toBe(true);
    expect(agent1.estimatedCost).toBeGreaterThan(0);
    expect(agent1.cost).toBe(0);

    // Now simulate the agent completing with real cost
    testDb
      .prepare(
        `UPDATE agents SET status = 'completed', cost_usd = 1.5, updated_at = ? WHERE id = 'agt_trans'`,
      )
      .run(new Date().toISOString());

    // Second poll: agent is completed with real cost
    const res2 = await fetch(`${testServer?.url}/api/runs/run_trans/agents`);
    const data2 = await res2.json();
    const agent2 = data2.find((a: Record<string, unknown>) => a.id === "agt_trans");

    expect(agent2.isEstimate).toBe(false);
    expect(agent2.estimatedCost).toBe(0);
    expect(agent2.cost).toBe(1.5);
  });
});

describe("Spawning agent cost estimation", () => {
  beforeEach(async () => {
    db = createTestDb();
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_spawn",
      "spec_spawn",
      "running",
      0,
      4,
      50.0,
      0,
      0,
      "build",
      1,
      3,
      "{}",
      twoMinAgo,
      now,
    );

    // Spawning agent (between pending and running) - should get estimated cost
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_spawn",
      "run_spawn",
      "builder",
      "builder-spawn",
      "spawning",
      7777,
      "mod-spawn",
      null,
      null,
      0,
      0,
      0,
      0,
      0,
      null,
      twoMinAgo,
      now,
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("spawning agent with cost=0 gets estimatedCost > 0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_spawn/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_spawn");

    expect(agent).toBeDefined();
    expect(agent.status).toBe("spawning");
    expect(agent.cost).toBe(0);
    expect(agent.estimatedCost).toBeGreaterThan(0);
    expect(agent.isEstimate).toBe(true);
  });

  test("spawning agent estimated cost approximates 2min * $0.05/min", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_spawn/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_spawn");

    // 2 min * $0.05/min = $0.10
    expect(agent.estimatedCost).toBeGreaterThan(0.05);
    expect(agent.estimatedCost).toBeLessThan(0.2);
  });
});

describe("Failed/killed agent cost estimation", () => {
  beforeEach(async () => {
    db = createTestDb();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_dead",
      "spec_dead",
      "running",
      0,
      4,
      50.0,
      0,
      0,
      "build",
      1,
      3,
      "{}",
      fiveMinAgo,
      now,
    );

    // Failed agent with zero cost — should NOT get estimated
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_failed",
      "run_dead",
      "builder",
      "builder-failed",
      "failed",
      null,
      "mod-f",
      null,
      "red",
      1,
      0,
      0,
      0,
      120000,
      "Build error",
      fiveMinAgo,
      now,
    );

    // Killed agent with zero cost — should NOT get estimated
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_killed",
      "run_dead",
      "builder",
      "builder-killed",
      "killed",
      null,
      "mod-k",
      null,
      null,
      0,
      0,
      0,
      0,
      60000,
      "Killed by user",
      fiveMinAgo,
      now,
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("failed agent with cost=0 has estimatedCost=0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_dead/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_failed");

    expect(agent).toBeDefined();
    expect(agent.status).toBe("failed");
    expect(agent.cost).toBe(0);
    expect(agent.estimatedCost).toBe(0);
    expect(agent.isEstimate).toBe(false);
  });

  test("killed agent with cost=0 has estimatedCost=0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_dead/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_killed");

    expect(agent).toBeDefined();
    expect(agent.status).toBe("killed");
    expect(agent.cost).toBe(0);
    expect(agent.estimatedCost).toBe(0);
    expect(agent.isEstimate).toBe(false);
  });
});

describe("agent-enrichment utility functions", () => {
  test("computeElapsedMs returns > 0 for running agents", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const elapsed = computeElapsedMs(fiveMinAgo, "running");
    // Should be approximately 5 minutes = 300000ms
    expect(elapsed).toBeGreaterThan(290000);
    expect(elapsed).toBeLessThan(310000);
  });

  test("computeElapsedMs returns > 0 for spawning agents", () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const elapsed = computeElapsedMs(twoMinAgo, "spawning");
    expect(elapsed).toBeGreaterThan(110000);
    expect(elapsed).toBeLessThan(130000);
  });

  test("computeElapsedMs returns > 0 for pending agents", () => {
    const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const elapsed = computeElapsedMs(oneMinAgo, "pending");
    // Pending agents are active, so they should get elapsed time
    expect(elapsed).toBeGreaterThan(50000);
    expect(elapsed).toBeLessThan(70000);
  });

  test("computeElapsedMs returns 0 for completed agents", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const elapsed = computeElapsedMs(fiveMinAgo, "completed");
    expect(elapsed).toBe(0);
  });

  test("computeElapsedMs returns 0 for failed agents", () => {
    const elapsed = computeElapsedMs(new Date().toISOString(), "failed");
    expect(elapsed).toBe(0);
  });

  test("computeElapsedMs returns 0 for killed agents", () => {
    const elapsed = computeElapsedMs(new Date().toISOString(), "killed");
    expect(elapsed).toBe(0);
  });

  test("estimateCost returns 0 for 0 elapsed", () => {
    expect(estimateCost(0)).toBe(0);
  });

  test("estimateCost returns 0 for negative elapsed", () => {
    expect(estimateCost(-1000)).toBe(0);
  });

  test("estimateCost uses default rate of $0.05/min", () => {
    // 10 minutes = 600000ms
    const cost = estimateCost(600000);
    expect(cost).toBeCloseTo(0.5, 4); // 10 * 0.05 = 0.50
  });

  test("estimateCost accepts custom rate", () => {
    // 5 minutes at $0.10/min
    const cost = estimateCost(300000, 0.1);
    expect(cost).toBeCloseTo(0.5, 4); // 5 * 0.10 = 0.50
  });
});

describe("Running agent with real cost already set", () => {
  beforeEach(async () => {
    db = createTestDb();
    const now = new Date().toISOString();
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "run_real",
      "spec_real",
      "running",
      0,
      4,
      50.0,
      2.0,
      50000,
      "build",
      1,
      3,
      "{}",
      threeMinAgo,
      now,
    );

    // Running agent that already has a real cost (e.g., from heartbeat cost reporting)
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "agt_real_running",
      "run_real",
      "builder",
      "builder-real",
      "running",
      8888,
      "mod-real",
      null,
      "green",
      4,
      2.0,
      40000,
      0,
      180000,
      null,
      threeMinAgo,
      now,
    );

    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("running agent with real cost shows cost, not estimate", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_real/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_real_running");

    expect(agent).toBeDefined();
    expect(agent.status).toBe("running");
    expect(agent.cost).toBe(2.0);
    // When real cost exists, estimatedCost should be 0
    expect(agent.estimatedCost).toBe(0);
    expect(agent.isEstimate).toBe(false);
  });
});
