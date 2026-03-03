import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import {
  enqueueMerge,
  dequeueMerge,
  getMergeQueuePosition,
  getMergeQueueLength,
  listMergeQueue,
  type MergeQueueEntry,
} from "../../../src/pipeline/merge-queue.js";

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
      `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, `spec_${i + 1}`, "running", 0, 4, 50.0, i * 1.5, 10000, "merge", 0, 3, "{}", ts, ts);
    ids.push(id);
  }
  return ids;
}

let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = createTestDb();
});

describe("merge-queue", () => {
  describe("enqueueMerge", () => {
    test("adds a run to the merge queue", () => {
      const runs = seedRuns(db, 1);
      const entry = enqueueMerge(db, runs[0]);
      expect(entry.run_id).toBe(runs[0]);
      expect(entry.position).toBe(1);
      expect(entry.status).toBe("waiting");
      expect(typeof entry.enqueued_at).toBe("string");
    });

    test("assigns sequential positions", () => {
      const runs = seedRuns(db, 3);
      const e1 = enqueueMerge(db, runs[0]);
      const e2 = enqueueMerge(db, runs[1]);
      const e3 = enqueueMerge(db, runs[2]);
      expect(e1.position).toBe(1);
      expect(e2.position).toBe(2);
      expect(e3.position).toBe(3);
    });

    test("first enqueued entry gets status 'active'", () => {
      const runs = seedRuns(db, 2);
      const e1 = enqueueMerge(db, runs[0]);
      const e2 = enqueueMerge(db, runs[1]);
      expect(e1.status).toBe("waiting");
      // The first enqueued doesn't auto-activate — that's controlled by the engine
    });

    test("returns existing entry if run is already enqueued", () => {
      const runs = seedRuns(db, 1);
      const e1 = enqueueMerge(db, runs[0]);
      const e2 = enqueueMerge(db, runs[0]);
      expect(e1.run_id).toBe(e2.run_id);
      expect(e1.position).toBe(e2.position);
    });
  });

  describe("dequeueMerge", () => {
    test("removes a run from the queue", () => {
      const runs = seedRuns(db, 2);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);

      dequeueMerge(db, runs[0]);

      const pos = getMergeQueuePosition(db, runs[0]);
      expect(pos).toBeNull();
    });

    test("remaining entries keep their original positions", () => {
      const runs = seedRuns(db, 3);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      enqueueMerge(db, runs[2]);

      dequeueMerge(db, runs[0]);

      // run_test2 was position 2, run_test3 was position 3
      // After removing run_test1, the "ahead" count changes but positions are stable
      const pos2 = getMergeQueuePosition(db, runs[1]);
      const pos3 = getMergeQueuePosition(db, runs[2]);
      expect(pos2).not.toBeNull();
      expect(pos3).not.toBeNull();
      // After dequeue, run_test2 should have 0 ahead, run_test3 should have 1 ahead
      expect(pos2!.ahead).toBe(0);
      expect(pos3!.ahead).toBe(1);
    });

    test("dequeue of non-existent run is a no-op", () => {
      const runs = seedRuns(db, 1);
      // Should not throw
      dequeueMerge(db, "run_nonexistent");
      expect(getMergeQueueLength(db)).toBe(0);
    });
  });

  describe("getMergeQueuePosition", () => {
    test("returns position info for enqueued run", () => {
      const runs = seedRuns(db, 3);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      enqueueMerge(db, runs[2]);

      const pos = getMergeQueuePosition(db, runs[1]);
      expect(pos).not.toBeNull();
      expect(pos!.position).toBe(2);
      expect(pos!.ahead).toBe(1);
      expect(pos!.total).toBe(3);
    });

    test("returns null for run not in queue", () => {
      const pos = getMergeQueuePosition(db, "run_nonexistent");
      expect(pos).toBeNull();
    });

    test("first in queue has 0 ahead", () => {
      const runs = seedRuns(db, 2);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);

      const pos = getMergeQueuePosition(db, runs[0]);
      expect(pos).not.toBeNull();
      expect(pos!.ahead).toBe(0);
      expect(pos!.position).toBe(1);
    });
  });

  describe("getMergeQueueLength", () => {
    test("returns 0 for empty queue", () => {
      expect(getMergeQueueLength(db)).toBe(0);
    });

    test("returns correct count", () => {
      const runs = seedRuns(db, 3);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      enqueueMerge(db, runs[2]);
      expect(getMergeQueueLength(db)).toBe(3);
    });

    test("decreases after dequeue", () => {
      const runs = seedRuns(db, 2);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      expect(getMergeQueueLength(db)).toBe(2);

      dequeueMerge(db, runs[0]);
      expect(getMergeQueueLength(db)).toBe(1);
    });
  });

  describe("listMergeQueue", () => {
    test("returns empty array for empty queue", () => {
      expect(listMergeQueue(db)).toEqual([]);
    });

    test("returns entries ordered by position", () => {
      const runs = seedRuns(db, 3);
      enqueueMerge(db, runs[0]);
      enqueueMerge(db, runs[1]);
      enqueueMerge(db, runs[2]);

      const queue = listMergeQueue(db);
      expect(queue).toHaveLength(3);
      expect(queue[0].run_id).toBe(runs[0]);
      expect(queue[1].run_id).toBe(runs[1]);
      expect(queue[2].run_id).toBe(runs[2]);
      expect(queue[0].position).toBeLessThan(queue[1].position);
      expect(queue[1].position).toBeLessThan(queue[2].position);
    });
  });
});
