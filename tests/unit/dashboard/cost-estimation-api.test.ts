import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function insertRun(
  db: InstanceType<typeof Database>,
  id: string,
  opts: { budgetUsd?: number; costUsd?: number; status?: string } = {},
) {
  const { budgetUsd = 50.0, costUsd = 0, status = "running" } = opts;
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, "spec_test", status, "thorough", 4, budgetUsd, costUsd, 0, "build", 1, 3, "{}", "2026-03-01T10:00:00Z", "2026-03-01T12:00:00Z");
}

function insertAgent(
  db: InstanceType<typeof Database>,
  id: string,
  runId: string,
  opts: { status?: string; costUsd?: number; createdAt?: string; moduleId?: string | null } = {},
) {
  const {
    status = "running",
    costUsd = 0,
    createdAt = "2026-03-01T11:50:00Z",
    moduleId = null,
  } = opts;
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, runId, "builder", `builder-${id}`, status, status === "running" ? 1234 : null, moduleId, null, null, 0, costUsd, 0, 0, 0, null, createdAt, "2026-03-01T12:00:00Z");
}

function insertArchitectAgent(db: InstanceType<typeof Database>, runId: string) {
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(`agt_arch_${runId}`, runId, "architect", "architect", "completed", null, null, null, null, 0, 0, 0, 0, 0, null, "2026-03-01T09:55:00Z", "2026-03-01T10:00:00Z");
}

function insertBuildplan(db: InstanceType<typeof Database>, runId: string, modules: Array<{ id: string; title: string }>) {
  insertArchitectAgent(db, runId);
  const planJson = JSON.stringify({
    spec_id: "spec_test",
    modules: modules.map((m) => ({ id: m.id, title: m.title, description: `Module ${m.title}`, scope: { creates: [`${m.id}.ts`] } })),
    contracts: [],
    dependencies: [],
    parallelism: { max_concurrent: modules.length, parallel_groups: [{ phase: 1, modules: modules.map((m) => m.id) }] },
    integration_strategy: { checkpoints: [], final_integration: "test" },
    risks: [],
  });
  db.prepare(
    `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(`plan_${runId}`, runId, "spec_test", `agt_arch_${runId}`, 1, "active", planJson, modules.length, 0, modules.length, "2026-03-01T10:00:00Z", "2026-03-01T10:00:00Z");
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("poll-returns-estimated-cost-for-running-agents", () => {
  beforeEach(async () => {
    db = createTestDb();
    insertRun(db, "run_poll");
    // Running agent with zero cost, created 5 minutes ago
    insertAgent(db, "agt_running", "run_poll", { status: "running", costUsd: 0, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() });
    // Completed agent with actual cost
    insertAgent(db, "agt_completed", "run_poll", { status: "completed", costUsd: 0.50 });
    // Pending agent with zero cost
    insertAgent(db, "agt_pending", "run_poll", { status: "pending", costUsd: 0 });
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) { server.stop(); server = null; }
    db.close();
  });

  test("running agent has estimatedCost > 0 and isEstimate=true", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_poll/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_running");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(true);
    expect(agent.estimatedCost).toBeGreaterThan(0);
    // Approximately 5 min * 0.05/min = ~0.25
    expect(agent.estimatedCost).toBeGreaterThan(0.1);
    expect(agent.estimatedCost).toBeLessThan(1.0);
  });

  test("completed agent has isEstimate=false and cost=0.50", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_poll/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_completed");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(false);
    expect(agent.cost).toBe(0.50);
    expect(agent.estimatedCost).toBe(0);
  });

  test("pending agent has isEstimate=false and estimatedCost=0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_poll/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_pending");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(false);
    expect(agent.estimatedCost).toBe(0);
  });
});

describe("run-summary-includes-aggregated-estimated-cost", () => {
  beforeEach(async () => {
    db = createTestDb();
    insertRun(db, "run_agg", { budgetUsd: 50.0, costUsd: 1.0 });
    // 2 running agents, created 3 min ago
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    insertAgent(db, "agt_r1", "run_agg", { status: "running", costUsd: 0, createdAt: threeMinAgo });
    insertAgent(db, "agt_r2", "run_agg", { status: "running", costUsd: 0, createdAt: threeMinAgo });
    // 1 completed agent with cost
    insertAgent(db, "agt_c1", "run_agg", { status: "completed", costUsd: 1.0 });
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) { server.stop(); server = null; }
    db.close();
  });

  test("run summary includes estimatedCost > 0 aggregated from running agents", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_agg`);
    const data = await res.json();

    expect(data.estimatedCost).toBeGreaterThan(0);
    // 2 agents * 3min * 0.05/min = ~0.30
    expect(data.estimatedCost).toBeGreaterThan(0.1);
    expect(data.estimatedCost).toBeLessThan(2.0);
  });

  test("run summary cost field is actual cost from DB", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_agg`);
    const data = await res.json();

    expect(data.cost).toBe(1.0);
  });
});

describe("budget-progress-reflects-estimated-costs", () => {
  beforeEach(async () => {
    db = createTestDb();
    insertRun(db, "run_budget", { budgetUsd: 10.0, costUsd: 4.0 });
    // 2 running agents, created 10 min ago (~0.50 each estimated)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    insertAgent(db, "agt_b1", "run_budget", { status: "running", costUsd: 0, createdAt: tenMinAgo });
    insertAgent(db, "agt_b2", "run_budget", { status: "running", costUsd: 0, createdAt: tenMinAgo });
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) { server.stop(); server = null; }
    db.close();
  });

  test("budget percentage accounts for estimated costs", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_budget`);
    const data = await res.json();

    // cost=4.0, estimatedCost~=1.0 (2 agents * 10min * 0.05/min), budget=10.0
    // budgetPct = (4.0 + ~1.0) / 10.0 * 100 = ~50%
    const totalCost = data.cost + data.estimatedCost;
    expect(totalCost).toBeGreaterThan(4.0); // Must be more than just actual cost
    expect(data.estimatedCost).toBeGreaterThan(0);
    expect(data.budget).toBe(10.0);
  });
});

describe("cost-estimates-update-on-successive-polls", () => {
  beforeEach(async () => {
    db = createTestDb();
    insertRun(db, "run_poll2");
    // Running agent with zero cost
    insertAgent(db, "agt_polling", "run_poll2", {
      status: "running",
      costUsd: 0,
      createdAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
    });
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) { server.stop(); server = null; }
    db.close();
  });

  test("second poll returns higher estimatedCost than first", async () => {
    const res1 = await fetch(`${server?.url}/api/runs/run_poll2/agents`);
    const data1 = await res1.json();
    const e1 = data1.find((a: Record<string, unknown>) => a.id === "agt_polling").estimatedCost;

    // Wait a tiny bit - the cost increases in real time based on Date.now()
    await new Promise((r) => setTimeout(r, 100));

    const res2 = await fetch(`${server?.url}/api/runs/run_poll2/agents`);
    const data2 = await res2.json();
    const e2 = data2.find((a: Record<string, unknown>) => a.id === "agt_polling").estimatedCost;

    expect(e2).toBeGreaterThan(e1);
  });
});

describe("module-status-includes-cost-estimate", () => {
  beforeEach(async () => {
    db = createTestDb();
    insertRun(db, "run_mod");
    const eightMinAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();
    insertAgent(db, "agt_mod_running", "run_mod", { status: "running", costUsd: 0, createdAt: eightMinAgo, moduleId: "mod-api" });
    insertAgent(db, "agt_mod_pending", "run_mod", { status: "pending", costUsd: 0, moduleId: "mod-ui" });
    insertBuildplan(db, "run_mod", [
      { id: "mod-api", title: "API Server" },
      { id: "mod-ui", title: "Dashboard UI" },
    ]);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) { server.stop(); server = null; }
    db.close();
  });

  test("running module has estimatedCost > 0 and isEstimate=true", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_mod/modules`);
    const data = await res.json();
    const mod = data.find((m: Record<string, unknown>) => m.id === "mod-api");

    expect(mod).toBeDefined();
    expect(mod.isEstimate).toBe(true);
    expect(mod.estimatedCost).toBeGreaterThan(0);
  });

  test("pending module has estimatedCost=0 and isEstimate=false", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_mod/modules`);
    const data = await res.json();
    const mod = data.find((m: Record<string, unknown>) => m.id === "mod-ui");

    expect(mod).toBeDefined();
    expect(mod.isEstimate).toBe(false);
    expect(mod.estimatedCost).toBe(0);
  });
});
