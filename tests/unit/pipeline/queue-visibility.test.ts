import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { enqueueMerge, getMergeQueuePosition } from "../../../src/pipeline/merge-queue.js";
import { formatQueueStatus, getRunQueueInfo, type RunQueueInfo } from "../../../src/pipeline/queue-visibility.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedRuns(db: InstanceType<typeof Database>, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `run_test${i + 1}`;
    const ts = `2026-03-01T12:0${i}:00Z`;
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, `spec_${i + 1}`, "running", "thorough", 4, 50.0, i * 1.5, 10000, "merge", 0, 3, "{}", ts, ts);
    ids.push(id);
  }
  return ids;
}

let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = createTestDb();
});

describe("queue-visibility", () => {
  describe("formatQueueStatus", () => {
    test("returns empty string when no queue info", () => {
      expect(formatQueueStatus(null)).toBe("");
    });

    test("formats 'merging' for first in queue", () => {
      const info: RunQueueInfo = { position: 1, ahead: 0, total: 3 };
      const result = formatQueueStatus(info);
      expect(result).toContain("merging");
    });

    test("formats queue position with ahead count", () => {
      const info: RunQueueInfo = { position: 3, ahead: 2, total: 5 };
      const result = formatQueueStatus(info);
      expect(result).toContain("queued");
      expect(result).toContain("2 ahead");
    });

    test("formats singular 'ahead' for 1 run ahead", () => {
      const info: RunQueueInfo = { position: 2, ahead: 1, total: 3 };
      const result = formatQueueStatus(info);
      expect(result).toContain("queued");
      expect(result).toContain("1 ahead");
    });
  });

  describe("getRunQueueInfo", () => {
    test("returns null for run not in merge phase", () => {
      // Create a run in build phase
      db.prepare(
        `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run("run_build", "spec_1", "running", "thorough", 4, 50.0, 0, 0, "build", 0, 3, "{}", "2026-03-01T12:00:00Z", "2026-03-01T12:00:00Z");

      expect(getRunQueueInfo(db, "run_build")).toBeNull();
    });

    test("returns null for run in merge phase but not in queue", () => {
      const runs = seedRuns(db, 1);
      // Don't enqueue it
      expect(getRunQueueInfo(db, runs[0])).toBeNull();
    });

    test("returns queue info for enqueued run", () => {
      const runs = seedRuns(db, 3);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      enqueueMerge(db, runs[2]);

      const info = getRunQueueInfo(db, runs[1]);
      expect(info).not.toBeNull();
      expect(info!.position).toBe(2);
      expect(info!.ahead).toBe(1);
      expect(info!.total).toBe(3);
    });

    test("first enqueued run shows 0 ahead", () => {
      const runs = seedRuns(db, 2);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);

      const info = getRunQueueInfo(db, runs[0]);
      expect(info).not.toBeNull();
      expect(info!.ahead).toBe(0);
    });
  });
});
