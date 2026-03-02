import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { SqliteDb } from "../db/index.js";

/**
 * State stored in the .df/merge.lock file.
 * Conforms to the MergeLockFileFormat contract:
 * { runId: string, acquiredAt: string (ISO 8601), pid: integer }
 * No additional properties allowed.
 */
export interface MergeLockInfo {
  runId: string;
  acquiredAt: string;
  pid: number;
}

/** @deprecated Use MergeLockInfo instead */
export type MergeLockState = MergeLockInfo;

const LOCK_FILENAME = "merge.lock";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 1_000;

function lockPath(dfDir: string): string {
  return join(dfDir, LOCK_FILENAME);
}

/**
 * Check if a process with the given PID is still alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    // Sending signal 0 checks existence without killing
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse the merge lock file.
 * Returns null if the file doesn't exist or is corrupt.
 */
export function getMergeLockInfo(dfDir: string): MergeLockInfo | null {
  const path = lockPath(dfDir);
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);

    // Validate required fields and types per MergeLockFileFormat schema
    if (
      typeof parsed.runId !== "string" ||
      typeof parsed.acquiredAt !== "string" ||
      !Number.isInteger(parsed.pid)
    ) {
      return null;
    }

    return {
      runId: parsed.runId,
      acquiredAt: parsed.acquiredAt,
      pid: parsed.pid,
    };
  } catch {
    // Corrupted or unreadable lock file
    return null;
  }
}

/** @deprecated Use getMergeLockInfo instead */
export const getMergeLockState = getMergeLockInfo;

/**
 * Acquire the merge lock.
 *
 * Creates a lockfile at `<dfDir>/merge.lock` with the run ID, PID, and timestamp.
 * Returns true if the lock was acquired, false if it's held by another live run.
 *
 * - If no lock exists, creates it and returns true.
 * - If lock is held by the same runId, returns true (idempotent).
 * - If lock is held by a dead PID, steals it and returns true (stale lock detection).
 * - If lock is held by another run with a live PID, returns false.
 */
export function acquireMergeLock(dfDir: string, runId: string): boolean {
  const existing = getMergeLockInfo(dfDir);

  if (existing) {
    // Same run re-acquiring — idempotent
    if (existing.runId === runId) {
      return true;
    }

    // Different run — check if the holder is still alive
    if (isProcessAlive(existing.pid)) {
      return false;
    }

    // Stale lock (dead PID) — steal it
  }

  // Write new lock
  const lockInfo: MergeLockInfo = {
    runId,
    acquiredAt: new Date().toISOString(),
    pid: process.pid,
  };

  writeFileSync(lockPath(dfDir), JSON.stringify(lockInfo, null, 2));
  return true;
}

/**
 * Release the merge lock, but only if it belongs to the given runId.
 * No-op if the lock doesn't exist or belongs to a different run.
 */
export function releaseMergeLock(dfDir: string, runId: string): void {
  const existing = getMergeLockInfo(dfDir);
  if (!existing) return;
  if (existing.runId !== runId) return;

  try {
    unlinkSync(lockPath(dfDir));
  } catch {
    // Lock file may have been removed by another process
  }
}

/**
 * Wait until the merge lock can be acquired, or throw on timeout.
 *
 * Polls at the specified interval. If the lock holder's PID is dead,
 * the stale lock is automatically stolen.
 *
 * @param dfDir - The .df directory path
 * @param runId - The run ID to acquire the lock for
 * @param timeoutMs - Maximum time to wait (default: 300000 = 5 minutes)
 * @param pollIntervalMs - Polling interval (default: 1000 = 1 second)
 */
export async function waitForMergeLock(
  dfDir: string,
  runId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  pollIntervalMs: number = POLL_INTERVAL_MS,
): Promise<void> {
  const start = Date.now();

  while (true) {
    if (acquireMergeLock(dfDir, runId)) {
      return;
    }

    const elapsed = Date.now() - start;
    if (elapsed >= timeoutMs) {
      throw new Error(
        `Merge lock timeout: could not acquire lock within ${timeoutMs}ms. ` +
        `Lock held by run: ${getMergeLockInfo(dfDir)?.runId ?? "unknown"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/**
 * Get the merge queue position for a given run.
 *
 * Returns:
 * - 0 if this run currently holds the lock
 * - null if this run is not in the merge phase / not queued
 * - A positive integer indicating how many runs are ahead in the queue
 *
 * Queue position is determined by counting runs in "merge" phase
 * that were created before this run.
 */
export function getMergeQueuePosition(
  dfDir: string,
  db: SqliteDb,
  runId: string,
): number | null {
  // Check if this run holds the lock
  const lockInfo = getMergeLockInfo(dfDir);
  if (lockInfo?.runId === runId) {
    return 0;
  }

  // Query runs in merge phase, ordered by creation time
  try {
    const rows = db
      .query(
        `SELECT id, created_at FROM runs
         WHERE current_phase = 'merge' AND status = 'running'
         ORDER BY created_at ASC`,
      )
      .all() as Array<{ id: string; created_at: string }>;

    const myIndex = rows.findIndex((r) => r.id === runId);
    if (myIndex === -1) return null;

    // Position is the number of runs ahead (those with earlier created_at)
    const ahead = myIndex;
    if (lockInfo && rows.some((r) => r.id === lockInfo.runId)) {
      // Lock holder is in the list, but they count as "merging" not "ahead"
      // They're at position 0, everyone else shifts
    }

    return ahead;
  } catch {
    return null;
  }
}
