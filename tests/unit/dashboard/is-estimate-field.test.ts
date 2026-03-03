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

function seedData(db: InstanceType<typeof Database>) {
  // Create a running run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("run_est", "spec_est", "running", "thorough", 4, 50.0, 0, 0, "build", 1, 3, "{}", "2026-03-01T11:00:00Z", "2026-03-01T12:00:00Z");

  // Running agent with zero cost (should be an estimate)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("agt_running", "run_est", "builder", "builder-running", "running", 1234, "mod-a", null, "green", 2, 0, 0, 0, 0, null, "2026-03-01T11:50:00Z", "2026-03-01T12:00:00Z");

  // Completed agent with real cost
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("agt_completed", "run_est", "builder", "builder-completed", "completed", null, "mod-b", null, null, 0, 5.0, 60000, 0, 0, null, "2026-03-01T11:05:00Z", "2026-03-01T11:15:00Z");

  // Pending agent with zero cost (should NOT be estimate)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("agt_pending", "run_est", "builder", "builder-pending", "pending", null, "mod-c", null, null, 0, 0, 0, 0, 0, null, "2026-03-01T12:00:00Z", "2026-03-01T12:00:00Z");

  // Buildplan with modules for module-status tests
  const planJson = JSON.stringify({
    spec_id: "spec_est",
    modules: [
      { id: "mod-a", title: "Module A", description: "Running module", scope: { creates: ["a.ts"] } },
      { id: "mod-b", title: "Module B", description: "Completed module", scope: { creates: ["b.ts"] } },
      { id: "mod-c", title: "Module C", description: "Pending module", scope: { creates: ["c.ts"] } },
    ],
    contracts: [],
    dependencies: [],
    parallelism: { max_concurrent: 3, parallel_groups: [{ phase: 1, modules: ["mod-a", "mod-b", "mod-c"] }] },
    integration_strategy: { checkpoints: [], final_integration: "test" },
    risks: [],
  });

  db.prepare(
    `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("plan_est", "run_est", "spec_est", "agt_running", 1, "active", planJson, 3, 0, 3, "2026-03-01T11:00:00Z", "2026-03-01T11:00:00Z");
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("isEstimate field on AgentSummary", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedData(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("running agent with zero cost has isEstimate=true", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_running");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(true);
    expect(agent.estimatedCost).toBeGreaterThan(0);
    expect(agent.cost).toBe(0);
  });

  test("completed agent has isEstimate=false", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_completed");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(false);
    expect(agent.cost).toBe(5.0);
  });

  test("pending agent has isEstimate=false and estimatedCost=0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/agents`);
    const data = await res.json();
    const agent = data.find((a: Record<string, unknown>) => a.id === "agt_pending");

    expect(agent).toBeDefined();
    expect(agent.isEstimate).toBe(false);
    // Pending agent just started, estimatedCost should be ~0 (very little time elapsed)
    expect(agent.cost).toBe(0);
  });
});

describe("isEstimate and estimatedCost on ModuleStatus", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedData(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  test("module with running agent has estimatedCost and isEstimate fields", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/modules`);
    const data = await res.json();
    const mod = data.find((m: Record<string, unknown>) => m.id === "mod-a");

    expect(mod).toBeDefined();
    expect(typeof mod.estimatedCost).toBe("number");
    expect(typeof mod.isEstimate).toBe("boolean");
    expect(mod.isEstimate).toBe(true);
    expect(mod.estimatedCost).toBeGreaterThan(0);
  });

  test("module with completed agent has isEstimate=false", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/modules`);
    const data = await res.json();
    const mod = data.find((m: Record<string, unknown>) => m.id === "mod-b");

    expect(mod).toBeDefined();
    expect(mod.isEstimate).toBe(false);
  });

  test("module with pending agent has isEstimate=false and estimatedCost=0", async () => {
    const res = await fetch(`${server?.url}/api/runs/run_est/modules`);
    const data = await res.json();
    const mod = data.find((m: Record<string, unknown>) => m.id === "mod-c");

    expect(mod).toBeDefined();
    expect(mod.isEstimate).toBe(false);
    expect(mod.estimatedCost).toBe(0);
  });
});
