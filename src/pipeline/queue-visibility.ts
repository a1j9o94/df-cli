/**
 * Queue Visibility — formatting and query helpers for displaying
 * merge queue status in `dark status` and the dashboard API.
 *
 * Contract: RunSummaryQueueExtension (implementer)
 *
 * This module provides:
 * 1. formatQueueStatus() — formats queue position as a human-readable string
 * 2. getRunQueueInfo() — fetches queue position for a specific run
 */

import type { SqliteDb } from "../db/index.js";
import { getMergeQueuePosition, type QueuePosition } from "./merge-queue.js";

// --- Contract: RunQueueInfo ---

export interface RunQueueInfo {
  position: number;
  ahead: number;
  total: number;
}

/**
 * Format queue status for CLI display.
 *
 * Examples:
 * - null → ""
 * - { position: 1, ahead: 0, total: 3 } → "(merging)"
 * - { position: 2, ahead: 1, total: 3 } → "(queued, 1 ahead)"
 * - { position: 3, ahead: 2, total: 5 } → "(queued, 2 ahead)"
 */
export function formatQueueStatus(info: RunQueueInfo | null): string {
  if (!info) return "";

  if (info.ahead === 0) {
    return "(merging)";
  }

  return `(queued, ${info.ahead} ahead)`;
}

/**
 * Get queue info for a run. Returns null if the run is not in the
 * merge phase or not in the queue.
 */
export function getRunQueueInfo(db: SqliteDb, runId: string): RunQueueInfo | null {
  // Check if the run is in merge phase
  const run = db
    .prepare("SELECT current_phase FROM runs WHERE id = ?")
    .get(runId) as { current_phase: string | null } | null;

  if (!run || run.current_phase !== "merge") {
    return null;
  }

  // Check the merge queue
  const position = getMergeQueuePosition(db, runId);
  if (!position) {
    return null;
  }

  return {
    position: position.position,
    ahead: position.ahead,
    total: position.total,
  };
}
