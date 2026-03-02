/**
 * Merge Queue — tracks which runs are waiting to merge and their queue position.
 *
 * Contract: MergeLockAPI (consumer)
 * Contract: RunSummaryQueueExtension (implementer)
 *
 * The merge queue provides visibility into which runs are waiting to merge,
 * what position they're in, and how many runs are ahead. This information
 * is surfaced in `dark status` and the dashboard API.
 */

import type { SqliteDb } from "../db/index.js";
import { newMergeQueueId } from "../utils/id.js";

// --- Contract: MergeQueueEntry ---

export interface MergeQueueEntry {
  id: string;
  run_id: string;
  position: number;
  status: "waiting" | "active" | "completed";
  enqueued_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// --- Contract: QueuePosition ---

export interface QueuePosition {
  position: number;
  ahead: number;
  total: number;
}

// --- Helpers ---

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- Queue Operations ---

/**
 * Add a run to the merge queue. Returns the queue entry.
 * If the run is already enqueued, returns the existing entry.
 */
export function enqueueMerge(db: SqliteDb, runId: string): MergeQueueEntry {
  // Check if already enqueued
  const existing = db
    .prepare("SELECT * FROM merge_queue WHERE run_id = ?")
    .get(runId) as MergeQueueEntry | null;

  if (existing) {
    return existing;
  }

  // Get the next position (max position + 1, or 1 if empty)
  const maxPos = db
    .prepare("SELECT MAX(position) as max_pos FROM merge_queue")
    .get() as { max_pos: number | null };
  const nextPosition = (maxPos.max_pos ?? 0) + 1;

  const id = newMergeQueueId();
  const ts = now();

  db.prepare(
    `INSERT INTO merge_queue (id, run_id, position, status, enqueued_at)
     VALUES (?, ?, ?, 'waiting', ?)`,
  ).run(id, runId, nextPosition, ts);

  return db
    .prepare("SELECT * FROM merge_queue WHERE id = ?")
    .get(id) as MergeQueueEntry;
}

/**
 * Remove a run from the merge queue.
 */
export function dequeueMerge(db: SqliteDb, runId: string): void {
  db.prepare("DELETE FROM merge_queue WHERE run_id = ?").run(runId);
}

/**
 * Get the queue position for a run, including how many runs are ahead.
 * Returns null if the run is not in the queue.
 */
export function getMergeQueuePosition(db: SqliteDb, runId: string): QueuePosition | null {
  const entry = db
    .prepare("SELECT * FROM merge_queue WHERE run_id = ?")
    .get(runId) as MergeQueueEntry | null;

  if (!entry) {
    return null;
  }

  // Count how many entries have a lower position (i.e., are ahead in the queue)
  const aheadResult = db
    .prepare("SELECT COUNT(*) as cnt FROM merge_queue WHERE position < ?")
    .get(entry.position) as { cnt: number };

  const totalResult = db
    .prepare("SELECT COUNT(*) as cnt FROM merge_queue")
    .get() as { cnt: number };

  return {
    position: entry.position,
    ahead: aheadResult.cnt,
    total: totalResult.cnt,
  };
}

/**
 * Get the total number of runs in the merge queue.
 */
export function getMergeQueueLength(db: SqliteDb): number {
  const result = db
    .prepare("SELECT COUNT(*) as cnt FROM merge_queue")
    .get() as { cnt: number };
  return result.cnt;
}

/**
 * List all entries in the merge queue, ordered by position.
 */
export function listMergeQueue(db: SqliteDb): MergeQueueEntry[] {
  return db
    .prepare("SELECT * FROM merge_queue ORDER BY position ASC")
    .all() as MergeQueueEntry[];
}

/**
 * Update the status of a merge queue entry.
 * Sets started_at when transitioning to 'active', completed_at when 'completed'.
 */
export function updateMergeQueueStatus(
  db: SqliteDb,
  runId: string,
  status: "waiting" | "active" | "completed",
): void {
  const ts = now();

  switch (status) {
    case "active":
      db.prepare(
        "UPDATE merge_queue SET status = ?, started_at = ? WHERE run_id = ?",
      ).run(status, ts, runId);
      break;
    case "completed":
      db.prepare(
        "UPDATE merge_queue SET status = ?, completed_at = ? WHERE run_id = ?",
      ).run(status, ts, runId);
      break;
    default:
      db.prepare(
        "UPDATE merge_queue SET status = ? WHERE run_id = ?",
      ).run(status, runId);
  }
}
