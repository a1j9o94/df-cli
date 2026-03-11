import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import type { SqliteDb } from "../db/index.js";
import type { DfConfig } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createEvent } from "../db/queries/events.js";
import { getMergerPrompt, getConflictResolutionSystemPrompt } from "../agents/prompts/merger.js";
import { findDfDir } from "../utils/config.js";
import { acquireMergeLock, releaseMergeLock, waitForMergeLock, getMergeLockInfo } from "./merge-lock.js";
import { mergeSingleBranch } from "./rebase-merge.js";
import { backupStateDb, restoreStateDb, removeBackup, isDbCorrupt } from "./state-db-backup.js";
import { sanitizeWorktree, sanitizeMainRepo, unstashMainRepo } from "./worktree-sanitization.js";
import { log } from "../utils/logger.js";

/**
 * Check if any tracked files in the repo contain git conflict markers.
 *
 * @param repoPath - Path to the git repository
 * @returns true if conflict markers are found, false otherwise
 */
export function hasConflictMarkers(repoPath: string): boolean {
  try {
    const result = execSync("git grep -l '<<<<<<<' -- ':!*.md' || true", {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Abort an in-progress merge.
 *
 * @param repoPath - Path to the git repository
 */
function abortMerge(repoPath: string): void {
  try {
    execSync("git merge --abort", { cwd: repoPath, stdio: "pipe" });
  } catch {
    // Merge may not be in progress
  }
}

/**
 * Look up the module name for a builder agent by its worktree path.
 * Falls back to the branch name if module_id is not set.
 */
function getModuleNameForWorktree(
  db: SqliteDb,
  runId: string,
  worktreePath: string,
): string {
  const agent = db.prepare(
    "SELECT module_id, name, branch_name FROM agents WHERE run_id = ? AND worktree_path = ? AND role = 'builder' LIMIT 1"
  ).get(runId, worktreePath) as { module_id: string | null; name: string; branch_name: string | null } | undefined;

  if (agent?.module_id) return agent.module_id;
  if (agent?.name) return agent.name;
  return "unknown";
}

/**
 * Execute the merge phase with lock acquisition and sequential conflict-aware merging.
 *
 * Flow:
 * 1. Wait for merge lock (up to 5 minutes)
 * 2. Log queue position if waiting
 * 3. For each builder branch sequentially:
 *    a. Attempt `git merge --no-commit`
 *    b. If clean: commit and move to next
 *    c. If conflicted: spawn merger agent to resolve, verify, continue
 * 4. Spawn merger agent for post-merge validation
 * 5. Release lock (always, even on failure)
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

  // Collect worktree paths from completed builders (with module info).
  // For workspace builds, builders from different projects will have worktrees
  // rooted in their respective project repos. The merge phase handles each
  // project's worktrees against that project's target branch.
  const completedBuilders = db.prepare(
    "SELECT worktree_path, module_id, name FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND worktree_path IS NOT NULL"
  ).all(runId) as { worktree_path: string; module_id: string | null; name: string }[];
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
    // Step 3: Merge each builder branch sequentially with conflict resolution
    if (worktreePaths.length > 0) {
      const projectRoot = dirname(dfDir);
      const mergedBranches: string[] = [];
      const failedBranches: string[] = [];
      const errors: string[] = [];

      // Pre-merge: Sanitize the main repo
      const mainSanitize = sanitizeMainRepo(projectRoot);
      if (!mainSanitize.success) {
        throw new Error(`Main repo sanitization failed: ${mainSanitize.error}`);
      }

      // Track which module was last merged (for conflict attribution)
      let lastMergedModule = "HEAD";

      try {
        for (const wtPath of worktreePaths) {
          const currentModule = getModuleNameForWorktree(db, runId, wtPath);

          // Sanitize the worktree before merge
          const sanitizeResult = sanitizeWorktree(wtPath);
          if (!sanitizeResult.success) {
            const branch = getBranchName(wtPath);
            failedBranches.push(branch);
            errors.push(sanitizeResult.error ?? `Worktree sanitization failed for ${branch}`);
            continue;
          }

          // Attempt merge
          const mergeResult = mergeSingleBranch(wtPath, projectRoot, targetBranch);

          if (mergeResult.status === "clean") {
            // Clean merge — record and continue
            mergedBranches.push(mergeResult.branch);
            createEvent(db, runId, "merge-branch-clean", {
              branch: mergeResult.branch,
              module: currentModule,
            });
            log.info(`Branch ${mergeResult.branch} (${currentModule}) merged cleanly`);
            lastMergedModule = currentModule;
          } else if (mergeResult.status === "conflicted") {
            // Conflict detected — spawn merger agent to resolve
            log.info(
              `Branch ${mergeResult.branch} (${currentModule}) has conflicts with ${lastMergedModule} — spawning conflict resolution agent`
            );

            const conflictedFiles = mergeResult.conflictedFiles ?? [];
            createEvent(db, runId, "merge-branch-conflicted", {
              branch: mergeResult.branch,
              module: currentModule,
              conflictedWith: lastMergedModule,
              conflictedFileCount: conflictedFiles.length,
              conflictedFilePaths: conflictedFiles.map((f) => f.path),
            });

            // Spawn merger agent with conflict resolution instructions
            try {
              await executeAgentPhaseFn(
                runId,
                "merger",
                (agentId) => getConflictResolutionSystemPrompt({
                  runId,
                  agentId,
                  targetBranch,
                  headModuleName: lastMergedModule,
                  incomingModuleName: currentModule,
                  incomingBranch: mergeResult.branch,
                  conflictedFileCount: conflictedFiles.length,
                }),
                {
                  runId,
                  targetBranch,
                  headModuleName: lastMergedModule,
                  incomingModuleName: currentModule,
                  incomingBranch: mergeResult.branch,
                  conflictedFiles,
                },
              );

              // Verify no conflict markers remain after agent resolution
              if (hasConflictMarkers(projectRoot)) {
                // Agent didn't fully resolve — abort and fail this branch
                abortMerge(projectRoot);
                failedBranches.push(mergeResult.branch);
                errors.push(
                  `Conflict markers remain in ${mergeResult.branch} after agent resolution`
                );
                createEvent(db, runId, "merge-branch-conflict-failed", {
                  branch: mergeResult.branch,
                  module: currentModule,
                  reason: "conflict-markers-remain",
                });
              } else {
                // Agent resolved successfully
                mergedBranches.push(mergeResult.branch);
                createEvent(db, runId, "merge-branch-conflict-resolved", {
                  branch: mergeResult.branch,
                  module: currentModule,
                  resolvedWith: lastMergedModule,
                });
                log.info(
                  `Branch ${mergeResult.branch} (${currentModule}) conflict resolved by agent`
                );
                lastMergedModule = currentModule;
              }
            } catch (agentErr) {
              // Agent failed — abort merge and record failure
              abortMerge(projectRoot);
              failedBranches.push(mergeResult.branch);
              const errMsg = agentErr instanceof Error ? agentErr.message : String(agentErr);
              errors.push(`Conflict resolution agent failed for ${mergeResult.branch}: ${errMsg}`);
              createEvent(db, runId, "merge-branch-conflict-failed", {
                branch: mergeResult.branch,
                module: currentModule,
                reason: "agent-failed",
                error: errMsg,
              });
            }
          } else {
            // Error (non-conflict failure)
            failedBranches.push(mergeResult.branch);
            errors.push(mergeResult.error ?? `Merge of ${mergeResult.branch} failed`);
            createEvent(db, runId, "merge-branch-error", {
              branch: mergeResult.branch,
              module: currentModule,
              error: mergeResult.error,
            });
          }
        }
      } finally {
        // Post-merge: Restore stashed changes on main
        if (mainSanitize.stashed) {
          unstashMainRepo(projectRoot);
        }
      }

      // Record overall merge result
      createEvent(db, runId, "rebase-merge-result", {
        mergedBranches,
        failedBranches,
        errors,
      });

      if (failedBranches.length > 0) {
        const failedList = failedBranches.join(", ");
        throw new Error(
          `Merge failed: branches with issues: ${failedList}. ` +
          `${mergedBranches.length} merged successfully, ` +
          `${failedBranches.length} failed. ` +
          `Errors: ${errors.join("; ")}`
        );
      }

      log.info(`All ${mergedBranches.length} branches merged successfully`);
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

    // Step 4: Spawn merger agent for post-merge validation
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
    // Step 5: Always release lock
    releaseMergeLock(dfDir, runId);
    createEvent(db, runId, "merge-lock-released");
    log.info("Merge lock released");
  }
}

/**
 * Get the branch name from a worktree path.
 * Helper extracted for use in error paths where the worktree may be in bad state.
 */
function getBranchName(worktreePath: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
    }).trim();
  } catch {
    return worktreePath;
  }
}
