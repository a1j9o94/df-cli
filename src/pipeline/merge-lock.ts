import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export interface MergeLockInfo {
  runId: string;
  acquiredAt: string;
  pid: number;
}

const LOCK_FILENAME = "merge.lock";

function lockPath(dfDir: string): string {
  return join(dfDir, LOCK_FILENAME);
}

/**
 * Check if a PID is alive. Returns true if the process exists.
 */
function isPidAlive(pid: number): boolean {
  try {
    // Sending signal 0 checks existence without sending actual signal
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
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content);
    if (
      typeof parsed.runId === "string" &&
      typeof parsed.acquiredAt === "string" &&
      typeof parsed.pid === "number"
    ) {
      return parsed as MergeLockInfo;
    }
    return null;
  } catch {
    return null;
  }
}

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
    // Same run — idempotent
    if (existing.runId === runId) {
      return true;
    }

    // Different run — check if PID is alive
    if (isPidAlive(existing.pid)) {
      return false; // Lock is held by a live process
    }

    // PID is dead — stale lock, steal it
  }

  // Write the lock
  const lockInfo: MergeLockInfo = {
    runId,
    acquiredAt: new Date().toISOString(),
    pid: process.pid,
  };

  writeFileSync(lockPath(dfDir), JSON.stringify(lockInfo, null, 2));
  return true;
}

/**
 * Release the merge lock.
 *
 * Removes the lockfile only if it belongs to the specified run.
 * No-op if the lock doesn't exist or belongs to another run.
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
 * Wait until the merge lock can be acquired, or timeout.
 *
 * Polls at the specified interval until the lock is acquired.
 * Throws if the timeout is exceeded.
 *
 * @param dfDir - The .df directory path
 * @param runId - The run ID to acquire the lock for
 * @param timeoutMs - Maximum time to wait (default: 300000 = 5 minutes)
 * @param pollIntervalMs - Polling interval (default: 1000 = 1 second)
 */
export async function waitForMergeLock(
  dfDir: string,
  runId: string,
  timeoutMs: number = 300_000,
  pollIntervalMs: number = 1_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (acquireMergeLock(dfDir, runId)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // One final attempt
  if (acquireMergeLock(dfDir, runId)) {
    return;
  }

  throw new Error(
    `Merge lock timeout: could not acquire lock within ${timeoutMs}ms. ` +
    `Lock held by run: ${getMergeLockInfo(dfDir)?.runId ?? "unknown"}`
  );
}
