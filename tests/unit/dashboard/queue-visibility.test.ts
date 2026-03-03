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

function seedMergeQueueData(db: InstanceType<typeof Database>) {
  const now = "2026-03-01T12:00:00Z";

  // Create 3 runs all in merge phase
  for (let i = 1; i <= 3; i++) {
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `run_merge${i}`,
      `spec_merge${i}`,
      "running",
      0,
      4,
      50.0,
      i * 1.5,
      10000 * i,
      "merge",
      0,
      3,
      "{}",
      `2026-03-01T1${i}:00:00Z`,
      now,
    );
  }

  // Create a run NOT in merge phase
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_build1",
    "spec_build1",
    "running",
    0,
    4,
    50.0,
    2.0,
    5000,
    "build",
    0,
    3,
    "{}",
    "2026-03-01T10:00:00Z",
    now,
  );

  // Enqueue the 3 merge runs
  db.prepare(
    `INSERT INTO merge_queue (id, run_id, position, status, enqueued_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("mq_1", "run_merge1", 1, "active", "2026-03-01T12:00:00Z");

  db.prepare(
    `INSERT INTO merge_queue (id, run_id, position, status, enqueued_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("mq_2", "run_merge2", 2, "waiting", "2026-03-01T12:00:01Z");

  db.prepare(
    `INSERT INTO merge_queue (id, run_id, position, status, enqueued_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("mq_3", "run_merge3", 3, "waiting", "2026-03-01T12:00:02Z");
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("Dashboard API — Merge Queue Visibility", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedMergeQueueData(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
  });

  describe("GET /api/runs — RunSummary includes mergeQueue", () => {
    test("runs in merge queue have mergeQueue field", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();

      const mergeRun1 = data.find((r: Record<string, unknown>) => r.id === "run_merge1");
      expect(mergeRun1).toBeDefined();
      expect(mergeRun1.mergeQueue).toBeDefined();
      expect(mergeRun1.mergeQueue.position).toBe(1);
      expect(mergeRun1.mergeQueue.ahead).toBe(0);
      expect(mergeRun1.mergeQueue.total).toBe(3);
    });

    test("second run in queue shows 1 ahead", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();

      const mergeRun2 = data.find((r: Record<string, unknown>) => r.id === "run_merge2");
      expect(mergeRun2).toBeDefined();
      expect(mergeRun2.mergeQueue).toBeDefined();
      expect(mergeRun2.mergeQueue.position).toBe(2);
      expect(mergeRun2.mergeQueue.ahead).toBe(1);
    });

    test("third run in queue shows 2 ahead", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();

      const mergeRun3 = data.find((r: Record<string, unknown>) => r.id === "run_merge3");
      expect(mergeRun3).toBeDefined();
      expect(mergeRun3.mergeQueue).toBeDefined();
      expect(mergeRun3.mergeQueue.position).toBe(3);
      expect(mergeRun3.mergeQueue.ahead).toBe(2);
    });

    test("run NOT in merge queue has no mergeQueue field", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();

      const buildRun = data.find((r: Record<string, unknown>) => r.id === "run_build1");
      expect(buildRun).toBeDefined();
      expect(buildRun.mergeQueue).toBeUndefined();
    });
  });

  describe("GET /api/runs/:id — single run includes mergeQueue", () => {
    test("merge-queued run has mergeQueue field", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_merge2`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.mergeQueue).toBeDefined();
      expect(data.mergeQueue.position).toBe(2);
      expect(data.mergeQueue.ahead).toBe(1);
      expect(data.mergeQueue.total).toBe(3);
    });

    test("non-merge-queued run has no mergeQueue field", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_build1`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.mergeQueue).toBeUndefined();
    });
  });
});
