import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

// --- Test helpers ---

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedPausedRun(db: InstanceType<typeof Database>, overrides?: {
  runId?: string;
  costUsd?: number;
  budgetUsd?: number;
  pauseReason?: string;
  pausedAt?: string;
}) {
  const runId = overrides?.runId ?? "run_paused1";
  const cost = overrides?.costUsd ?? 14.87;
  const budget = overrides?.budgetUsd ?? 15.0;
  const pauseReason = overrides?.pauseReason ?? "budget_exceeded";
  const pausedAt = overrides?.pausedAt ?? "2026-03-01T12:30:00Z";

  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, paused_at, pause_reason, created_at, updated_at)
     VALUES (?, ?, 'paused', 0, 4, ?, ?, 180000, 'build', 1, 3, '{}', ?, ?, '2026-03-01T11:00:00Z', '2026-03-01T12:30:00Z')`,
  ).run(runId, "spec_test1", budget, cost, pausedAt, pauseReason);
}

function seedRunningRun(db: InstanceType<typeof Database>, runId = "run_running1") {
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, 'running', 0, 4, 50.0, 12.5, 150000, 'build', 1, 3, '{}', '2026-03-01T11:00:00Z', '2026-03-01T12:00:00Z')`,
  ).run(runId, "spec_test1");
}

function seedFailedRun(db: InstanceType<typeof Database>, runId = "run_failed1") {
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, error, created_at, updated_at)
     VALUES (?, ?, 'failed', 0, 4, 50.0, 30.0, 200000, 'build', 1, 3, '{}', 'Build failed', '2026-03-01T11:00:00Z', '2026-03-01T12:00:00Z')`,
  ).run(runId, "spec_test1");
}

let server: ServerHandle;
let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  if (server) server.stop();
});

describe("Dashboard Pause - API", () => {
  test("GET /api/runs returns paused run with pauseReason and pausedAt", async () => {
    seedPausedRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs`);
    expect(res.status).toBe(200);
    const runs = await res.json();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("paused");
    expect(runs[0].pauseReason).toBe("budget_exceeded");
    expect(runs[0].pausedAt).toBe("2026-03-01T12:30:00Z");
  });

  test("GET /api/runs/:id returns paused run with pause details", async () => {
    seedPausedRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1`);
    expect(res.status).toBe(200);
    const run = await res.json();
    expect(run.status).toBe("paused");
    expect(run.pauseReason).toBe("budget_exceeded");
    expect(run.pausedAt).toBe("2026-03-01T12:30:00Z");
  });

  test("GET /api/runs/:id returns resumeCommand for paused runs", async () => {
    seedPausedRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1`);
    const run = await res.json();
    expect(run.resumeCommand).toBe("dark continue run_paused1 --budget-usd <amount>");
  });

  test("running run does not include pauseReason or pausedAt", async () => {
    seedRunningRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_running1`);
    const run = await res.json();
    expect(run.status).toBe("running");
    expect(run.pauseReason).toBeUndefined();
    expect(run.pausedAt).toBeUndefined();
    expect(run.resumeCommand).toBeUndefined();
  });

  test("paused runs are distinct from failed runs in listing", async () => {
    seedPausedRun(db);
    seedFailedRun(db);
    seedRunningRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs`);
    const runs = await res.json();
    expect(runs).toHaveLength(3);

    const paused = runs.find((r: any) => r.status === "paused");
    const failed = runs.find((r: any) => r.status === "failed");
    const running = runs.find((r: any) => r.status === "running");

    expect(paused).toBeDefined();
    expect(failed).toBeDefined();
    expect(running).toBeDefined();
    expect(paused!.pauseReason).toBe("budget_exceeded");
    expect(failed!.pauseReason).toBeUndefined();
  });

  test("manual pause shows correct reason", async () => {
    seedPausedRun(db, { pauseReason: "manual" });
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1`);
    const run = await res.json();
    expect(run.pauseReason).toBe("manual");
  });

  test("paused run elapsed time is frozen at pause time", async () => {
    seedPausedRun(db);
    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1`);
    const run = await res.json();
    // Elapsed should be computed from created_at to updated_at (paused time), not now
    // created_at: 2026-03-01T11:00:00Z, updated_at: 2026-03-01T12:30:00Z = 1h 30m
    expect(run.elapsed).toBe("1h 30m");
  });
});

describe("Dashboard Pause - UI HTML", () => {
  test("dashboard HTML includes paused status badge CSS", async () => {
    server = await startServer({ port: 0, db });

    const res = await fetch(server.url);
    const html = await res.text();
    expect(html).toContain(".status-badge.paused");
    expect(html).toContain("var(--accent-yellow)");
  });

  test("dashboard HTML includes pause reason rendering logic", async () => {
    server = await startServer({ port: 0, db });

    const res = await fetch(server.url);
    const html = await res.text();
    // Check that the JS code handles pause reason rendering
    expect(html).toContain("pauseReason");
    expect(html).toContain("resumeCommand");
  });

  test("dashboard HTML includes budget_exceeded display text", async () => {
    server = await startServer({ port: 0, db });

    const res = await fetch(server.url);
    const html = await res.text();
    expect(html).toContain("Budget limit reached");
  });

  test("dashboard HTML includes Add Budget button rendering", async () => {
    server = await startServer({ port: 0, db });

    const res = await fetch(server.url);
    const html = await res.text();
    expect(html).toContain("Add Budget");
  });
});

describe("Dashboard Pause - Events timeline", () => {
  test("pause event appears in events list", async () => {
    seedPausedRun(db);

    // Add a run-paused event
    db.prepare(
      `INSERT INTO events (id, run_id, agent_id, type, data, created_at)
       VALUES (?, ?, NULL, 'run-paused', ?, '2026-03-01T12:30:00Z')`,
    ).run("evt_pause1", "run_paused1", JSON.stringify({
      reason: "budget_exceeded",
      cost: 14.87,
      budget: 15.0,
    }));

    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1/events`);
    const events = await res.json();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("run-paused");
    expect(events[0].data.reason).toBe("budget_exceeded");
  });
});

describe("Dashboard Pause - Phases API", () => {
  test("phases API shows paused phase for paused run", async () => {
    seedPausedRun(db);

    // Need a buildplan for phases to resolve properly
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, cost_usd, tokens_used, created_at, updated_at)
       VALUES (?, ?, 'architect', 'arch-1', 'completed', 1.0, 10000, '2026-03-01T11:00:00Z', '2026-03-01T11:05:00Z')`,
    ).run("agt_arch_p", "run_paused1");

    db.prepare(
      `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, created_at, updated_at)
       VALUES (?, ?, 'spec_test1', 'agt_arch_p', 1, 'active', ?, 2, 0, 2, '2026-03-01T11:05:00Z', '2026-03-01T11:05:00Z')`,
    ).run("plan_p1", "run_paused1", JSON.stringify({
      modules: [
        { id: "mod-a", title: "Module A", description: "First module" },
        { id: "mod-b", title: "Module B", description: "Second module" },
      ],
      contracts: [],
      dependencies: [],
    }));

    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_paused1/phases`);
    expect(res.status).toBe(200);
    const phases = await res.json();

    // The build phase (current_phase) should be "paused"
    const buildPhase = phases.find((p: any) => p.id === "build");
    expect(buildPhase).toBeDefined();
    expect(buildPhase!.status).toBe("paused");

    // Earlier phases should be completed
    const scoutPhase = phases.find((p: any) => p.id === "scout");
    expect(scoutPhase!.status).toBe("completed");
  });
});

describe("Dashboard Pause - Run without pause columns", () => {
  test("non-paused run has no pause fields in response", async () => {
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, 'completed', 0, 4, 50.0, 25.0, 200000, 'merge', 1, 3, '{}', '2026-03-01T11:00:00Z', '2026-03-01T12:00:00Z')`,
    ).run("run_completed1", "spec_test1");

    server = await startServer({ port: 0, db });

    const res = await fetch(`${server.url}/api/runs/run_completed1`);
    const run = await res.json();
    expect(run.status).toBe("completed");
    expect(run.pauseReason).toBeUndefined();
    expect(run.pausedAt).toBeUndefined();
    expect(run.resumeCommand).toBeUndefined();
  });
});
