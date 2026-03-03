import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

/**
 * Tests for fix-stale-agent-queries module.
 *
 * Contract: ModuleAgentLookup
 *   handleGetModules must return the LATEST agent for each module (ORDER BY created_at DESC),
 *   not an arbitrary/stale agent.
 *
 * Contract: CompletedCountDistinct
 *   completedCount in RunSummary must use COUNT(DISTINCT module_id) so that retried modules
 *   (multiple completed builders for same module) don't inflate the count.
 */

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Seed a run with a module that has been retried:
 * - agent-1 (failed) for mod-a, created first
 * - agent-2 (running) for mod-a, created second (the retry)
 */
function seedRetryScenario(db: InstanceType<typeof Database>) {
  // Create a run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_retry",
    "spec_retry",
    "running",
    0,
    4,
    50.0,
    5.0,
    50000,
    "build",
    1,
    3,
    "{}",
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:30:00Z",
  );

  // Create architect agent
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_arch_retry",
    "run_retry",
    "architect",
    "architect-retry",
    "completed",
    1000,
    null,
    null,
    null,
    0,
    1.0,
    10000,
    0,
    60000,
    null,
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:02:00Z",
  );

  // Create buildplan with one module
  const planJson = JSON.stringify({
    spec_id: "spec_retry",
    modules: [
      {
        id: "mod-a",
        title: "Module A",
        description: "A module that gets retried",
        scope: { creates: ["src/a.ts"], modifies: [] },
        estimated_complexity: "medium",
        estimated_tokens: 50000,
        estimated_duration_min: 10,
      },
    ],
    contracts: [],
    dependencies: [],
    parallelism: {
      max_concurrent: 1,
      parallel_groups: [{ phase: 1, modules: ["mod-a"] }],
      critical_path: ["mod-a"],
      critical_path_estimated_min: 10,
    },
    integration_strategy: { checkpoints: [], final_integration: "N/A" },
    risks: [],
    total_estimated_tokens: 50000,
    total_estimated_cost_usd: 1.0,
    total_estimated_duration_min: 10,
  });

  db.prepare(
    `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, critical_path_modules, estimated_duration_min, estimated_cost_usd, estimated_tokens, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "plan_retry",
    "run_retry",
    "spec_retry",
    "agt_arch_retry",
    1,
    "active",
    planJson,
    1,
    0,
    1,
    '["mod-a"]',
    10,
    1.0,
    50000,
    "2026-03-01T10:02:00Z",
    "2026-03-01T10:02:00Z",
  );

  // Agent 1: original builder for mod-a — FAILED
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_old_fail",
    "run_retry",
    "builder",
    "builder-mod-a-attempt1",
    "failed",
    2000,
    "mod-a",
    "plan_retry",
    "red",
    1,
    2.0,
    20000,
    0,
    120000,
    "Test failure",
    "2026-03-01T10:05:00Z", // created FIRST
    "2026-03-01T10:10:00Z",
  );

  // Agent 2: retry builder for mod-a — RUNNING (the latest)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_new_running",
    "run_retry",
    "builder",
    "builder-mod-a-attempt2",
    "running",
    3000,
    "mod-a",
    "plan_retry",
    "green",
    3,
    3.0,
    30000,
    0,
    180000,
    null,
    "2026-03-01T10:15:00Z", // created SECOND (later)
    "2026-03-01T10:30:00Z",
  );
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("ModuleAgentLookup contract: handleGetModules returns latest agent for retried modules", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedRetryScenario(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("module card shows LATEST agent status (running), not stale failed agent", async () => {
    const res = await fetch(`${server!.url}/api/runs/run_retry/modules`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.length).toBe(1);

    const modA = data[0];
    expect(modA.id).toBe("mod-a");
    // The LATEST agent is agt_new_running with status=running
    // If the bug exists, this returns "failed" from agt_old_fail
    expect(modA.agentStatus).toBe("running");
  });

  test("module card shows LATEST agent's TDD phase and cost", async () => {
    const res = await fetch(`${server!.url}/api/runs/run_retry/modules`);
    const data = await res.json();
    const modA = data[0];

    // The latest agent (agt_new_running) has tddPhase="green", cost=3.0, tokens=30000
    expect(modA.tddPhase).toBe("green");
    expect(modA.tddCycles).toBe(3);
    expect(modA.cost).toBe(3.0);
    expect(modA.tokens).toBe(30000);
  });
});

describe("CompletedCountDistinct contract: completedCount uses COUNT(DISTINCT module_id)", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedCompletedRetryScenario(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("completedCount equals distinct completed modules, not total completed builders", async () => {
    const res = await fetch(`${server!.url}/api/runs/run_completed`);
    expect(res.status).toBe(200);

    const data = await res.json();
    // 3 modules in buildplan, all completed
    // mod-c has 2 completed builders (original + retry), but still only 1 distinct module
    expect(data.moduleCount).toBe(3);
    // Should be 3 (distinct modules), NOT 4 (total completed builders)
    expect(data.completedCount).toBe(3);
  });

  test("completedCount never exceeds moduleCount", async () => {
    const res = await fetch(`${server!.url}/api/runs/run_completed`);
    const data = await res.json();
    expect(data.completedCount).toBeLessThanOrEqual(data.moduleCount);
  });
});

/**
 * Seed a run where module-c was retried and both attempts are "completed":
 * - mod-a: 1 completed builder
 * - mod-b: 1 completed builder
 * - mod-c: 2 completed builders (original + retry both completed)
 *
 * moduleCount = 3, but COUNT(*) of completed builders = 4
 * The fix should use COUNT(DISTINCT module_id) = 3
 */
function seedCompletedRetryScenario(db: InstanceType<typeof Database>) {
  // Create a completed run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_completed",
    "spec_completed",
    "completed",
    0,
    4,
    50.0,
    10.0,
    100000,
    "merge",
    1,
    3,
    "{}",
    "2026-03-01T09:00:00Z",
    "2026-03-01T10:00:00Z",
  );

  // Architect agent
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_arch_c",
    "run_completed",
    "architect",
    "architect-c",
    "completed",
    1000,
    null,
    null,
    null,
    0,
    1.0,
    10000,
    0,
    60000,
    null,
    "2026-03-01T09:00:00Z",
    "2026-03-01T09:02:00Z",
  );

  // Buildplan with 3 modules
  const planJson = JSON.stringify({
    spec_id: "spec_completed",
    modules: [
      { id: "mod-a", title: "Module A", description: "First module", scope: { creates: ["a.ts"] } },
      { id: "mod-b", title: "Module B", description: "Second module", scope: { creates: ["b.ts"] } },
      { id: "mod-c", title: "Module C", description: "Third module (retried)", scope: { creates: ["c.ts"] } },
    ],
    contracts: [],
    dependencies: [],
    parallelism: { max_concurrent: 3, parallel_groups: [{ phase: 1, modules: ["mod-a", "mod-b", "mod-c"] }] },
    integration_strategy: { checkpoints: [], final_integration: "N/A" },
    risks: [],
  });

  db.prepare(
    `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "plan_completed",
    "run_completed",
    "spec_completed",
    "agt_arch_c",
    1,
    "active",
    planJson,
    3,
    0,
    3,
    "2026-03-01T09:02:00Z",
    "2026-03-01T09:02:00Z",
  );

  // Builder for mod-a: completed
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_a_done",
    "run_completed",
    "builder",
    "builder-a",
    "completed",
    2000,
    "mod-a",
    "plan_completed",
    "green",
    5,
    2.0,
    20000,
    0,
    120000,
    null,
    "2026-03-01T09:05:00Z",
    "2026-03-01T09:20:00Z",
  );

  // Builder for mod-b: completed
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_b_done",
    "run_completed",
    "builder",
    "builder-b",
    "completed",
    2001,
    "mod-b",
    "plan_completed",
    "green",
    4,
    2.0,
    20000,
    0,
    120000,
    null,
    "2026-03-01T09:05:00Z",
    "2026-03-01T09:25:00Z",
  );

  // Builder for mod-c ATTEMPT 1: completed (original that later got retried)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_c_attempt1",
    "run_completed",
    "builder",
    "builder-c-attempt1",
    "completed",
    2002,
    "mod-c",
    "plan_completed",
    "green",
    2,
    1.5,
    15000,
    0,
    90000,
    null,
    "2026-03-01T09:05:00Z",
    "2026-03-01T09:15:00Z",
  );

  // Builder for mod-c ATTEMPT 2: also completed (retry that also completed)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_c_attempt2",
    "run_completed",
    "builder",
    "builder-c-attempt2",
    "completed",
    2003,
    "mod-c",
    "plan_completed",
    "green",
    6,
    2.5,
    25000,
    0,
    150000,
    null,
    "2026-03-01T09:20:00Z",
    "2026-03-01T09:30:00Z",
  );
}
