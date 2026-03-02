import { dirname } from "node:path";
import type { SqliteDb } from "../db/index.js";
import type { DfConfig } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createEvent } from "../db/queries/events.js";
import { getMergerPrompt } from "../agents/prompts/merger.js";
import { findDfDir } from "../utils/config.js";
import { acquireMergeLock, releaseMergeLock, waitForMergeLock, getMergeLockInfo } from "./merge-lock.js";
import { rebaseAndMerge } from "./rebase-merge.js";
import { backupStateDb, restoreStateDb, removeBackup, isDbCorrupt } from "./state-db-backup.js";
import { log } from "../utils/logger.js";

/**
 * Execute the merge phase with lock acquisition and rebase-before-merge strategy.
 *
 * 1. Wait for merge lock (up to 5 minutes)
 * 2. Log queue position if waiting
 * 3. Rebase all builder branches onto current HEAD of target branch
 * 4. Merge rebased branches into target
 * 5. Spawn merger agent for post-merge validation
 * 6. Release lock (always, even on failure)
 *
 * @param db - Database instance
 * @param runtime - Agent runtime for spawning merger agent
 * @param config - Pipeline configuration
 * @param runId - The current run ID
 * @param executeAgentPhaseFn - Callback to spawn a single agent phase (injected from engine)
 */
export async function executeMergePhase(
  db: SqliteDb,
  runtime: AgentRuntime,
  config: DfConfig,
  runId: string,
  executeAgentPhaseFn: (
    runId: string,
    role: "architect" | "evaluator" | "merger" | "integration-tester",
    getPrompt: (agentId: string) => string,
    instructionContext?: Record<string, unknown>,
  ) => Promise<void>,
): Promise<void> {
  const dfDir = findDfDir();
  if (!dfDir) {
    throw new Error("Cannot find .df directory for merge lock");
  }

  const targetBranch = config.project.branch;

  // Collect worktree paths from completed builders
  const completedBuilders = db.prepare(
    "SELECT worktree_path FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND worktree_path IS NOT NULL"
  ).all(runId) as { worktree_path: string }[];
  const worktreePaths = completedBuilders.map((b) => b.worktree_path);

  // Check for queue position before acquiring
  const existingLock = getMergeLockInfo(dfDir);
  if (existingLock && existingLock.runId !== runId) {
    log.info(`[dark] Merge queued: waiting for lock held by run ${existingLock.runId}`);
    console.log(`[dark] Merge queued: waiting for lock held by run ${existingLock.runId}`);
    createEvent(db, runId, "merge-queued", { heldByRunId: existingLock.runId });
  }

  // Step 1: Acquire merge lock (wait up to 5 minutes)
  try {
    await waitForMergeLock(dfDir, runId, 300_000);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    createEvent(db, runId, "merge-lock-timeout", { error });
    throw new Error(`Merge lock timeout: ${error}`);
  }

  createEvent(db, runId, "merge-lock-acquired");
  log.info("Merge lock acquired");

  // Step 2: Backup state DB before merge
  const backupResult = backupStateDb(dfDir);
  if (backupResult.success) {
    createEvent(db, runId, "state-db-backed-up");
    log.info("State DB backed up before merge");
  } else {
    log.warn(`Could not backup state DB: ${backupResult.error}`);
  }

  try {
    // Step 3-5: Rebase and merge all builder branches (with sanitization)
    if (worktreePaths.length > 0) {
      const projectRoot = dirname(dfDir);
      const mergeResult = rebaseAndMerge(worktreePaths, projectRoot, targetBranch);

      createEvent(db, runId, "rebase-merge-result", {
        mergedBranches: mergeResult.mergedBranches,
        failedBranches: mergeResult.failedBranches,
        errors: mergeResult.errors,
      });

      if (!mergeResult.success) {
        const failedList = mergeResult.failedBranches.join(", ");
        throw new Error(
          `Merge failed: branches with conflicts: ${failedList}. ` +
          `${mergeResult.mergedBranches.length} merged successfully, ` +
          `${mergeResult.failedBranches.length} failed. ` +
          `Errors: ${mergeResult.errors.join("; ")}`
        );
      }

      log.info(`All ${mergeResult.mergedBranches.length} branches merged successfully`);
    }

    // Verify state DB wasn't corrupted by the merge
    if (isDbCorrupt(dfDir)) {
      log.error("State DB corrupted during merge — restoring from backup");
      const restoreResult = restoreStateDb(dfDir);
      if (restoreResult.success) {
        createEvent(db, runId, "state-db-restored");
        log.info("State DB restored from backup");
      } else {
        log.error(`Failed to restore state DB: ${restoreResult.error}`);
      }
    }

    // Step 6: Spawn merger agent for post-merge validation
    await executeAgentPhaseFn(runId, "merger", (agentId) =>
      getMergerPrompt({ runId, agentId, targetBranch, worktreePaths }),
    );

    // Remove backup on successful completion
    removeBackup(dfDir);
    createEvent(db, runId, "state-db-backup-removed");
  } catch (err) {
    // On failure, check if DB was corrupted and restore
    if (isDbCorrupt(dfDir) && backupResult.success) {
      log.error("State DB corrupted during merge — restoring from backup");
      const restoreResult = restoreStateDb(dfDir);
      if (restoreResult.success) {
        log.info("State DB restored from backup");
      }
    }
    throw err;
  } finally {
    // Step 7: Always release lock
    releaseMergeLock(dfDir, runId);
    createEvent(db, runId, "merge-lock-released");
    log.info("Merge lock released");
  }
}
