import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";

describe("Dashboard Pause State", () => {
  let db: InstanceType<typeof Database>;
  let server: ServerHandle;

  beforeEach(async () => {
    db = new Database(":memory:");
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  test("GET /api/runs returns pauseReason and pausedAt for paused run", async () => {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, budget_usd, cost_usd, paused_at, pause_reason, config, created_at, updated_at)
       VALUES ('run_1', 'spec_1', 'paused', 15.00, 14.87, ?, 'budget_exceeded', '{}', ?, ?)`
    ).run(ts, ts, ts);

    const res = await fetch(`${server.url}/api/runs`);
    expect(res.status).toBe(200);
    const runs = await res.json();
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("paused");
    expect(runs[0].pauseReason).toBe("budget_exceeded");
    expect(runs[0].pausedAt).toBe(ts);
  });

  test("GET /api/runs/:id returns pauseReason and pausedAt for paused run", async () => {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, budget_usd, cost_usd, paused_at, pause_reason, config, created_at, updated_at)
       VALUES ('run_1', 'spec_1', 'paused', 15.00, 14.87, ?, 'budget_exceeded', '{}', ?, ?)`
    ).run(ts, ts, ts);

    const res = await fetch(`${server.url}/api/runs/run_1`);
    expect(res.status).toBe(200);
    const run = await res.json();
    expect(run.status).toBe("paused");
    expect(run.pauseReason).toBe("budget_exceeded");
    expect(run.pausedAt).toBe(ts);
  });

  test("GET /api/runs returns null pauseReason/pausedAt for running run", async () => {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, budget_usd, cost_usd, config, created_at, updated_at)
       VALUES ('run_1', 'spec_1', 'running', 50.00, 5.00, '{}', ?, ?)`
    ).run(ts, ts);

    const res = await fetch(`${server.url}/api/runs`);
    const runs = await res.json();
    expect(runs[0].pauseReason).toBeNull();
    expect(runs[0].pausedAt).toBeNull();
  });

  test("paused runs are visually distinct from failed runs (different status)", async () => {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, budget_usd, cost_usd, paused_at, pause_reason, config, created_at, updated_at)
       VALUES ('run_paused', 'spec_1', 'paused', 15.00, 14.87, ?, 'budget_exceeded', '{}', ?, ?)`
    ).run(ts, ts, ts);
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, budget_usd, cost_usd, error, config, created_at, updated_at)
       VALUES ('run_failed', 'spec_2', 'failed', 15.00, 14.87, 'some error', '{}', ?, ?)`
    ).run(ts, ts);

    const res = await fetch(`${server.url}/api/runs`);
    const runs = await res.json();
    const paused = runs.find((r: any) => r.id === "run_paused");
    const failed = runs.find((r: any) => r.id === "run_failed");
    expect(paused.status).toBe("paused");
    expect(failed.status).toBe("failed");
    expect(paused.status).not.toBe(failed.status);
    expect(paused.pauseReason).toBe("budget_exceeded");
    expect(failed.pauseReason).toBeNull();
  });
});
