import { execSync } from "node:child_process";
import { existsSync, unlinkSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { isProtectedPath, getProtectedFiles } from "../runtime/protected-paths.js";
import { sanitizeWorktree, sanitizeMainRepo, unstashMainRepo } from "./worktree-sanitization.js";

export interface RebaseResult {
  success: boolean;
  conflicted: boolean;
  branch: string;
  error?: string;
}

export interface MergeResult {
  success: boolean;
  mergedBranches: string[];
  failedBranches: string[];
  errors: string[];
  /** Per-branch results with conflict details (available when using mergeSingleBranch internally) */
  branchResults?: MergeBranchResult[];
}

/**
 * Contract: MergeBranchResult
 *
 * Result of attempting to merge a single branch into the target.
 * When conflicted=true, conflict markers are left on disk for the merger agent to resolve.
 */
export interface MergeBranchResult {
  /** Whether the merge completed successfully (clean merge, committed) */
  success: boolean;
  /** Whether the merge had conflicts (conflict markers left on disk) */
  conflicted: boolean;
  /** The branch name that was being merged */
  branch: string;
  /** List of files with conflicts (only when conflicted=true) */
  conflictedFiles?: string[];
  /** Error message if the merge failed for a non-conflict reason */
  error?: string;
}

/**
 * Contract: MergeSingleBranchFunction
 *
 * Type signature for the function that merges a single branch into the target.
 * The merge strategy (git merge, git rebase, etc.) is isolated inside this function.
 * Conflict detection, agent handoff, and prompt generation are separate concerns.
 */
export type MergeSingleBranchFunction = (
  mainRepoPath: string,
  branch: string,
) => MergeBranchResult;

/**
 * Get the branch name of a worktree.
 */
function getWorktreeBranch(worktreePath: string): string {
  return execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: worktreePath,
    encoding: "utf-8",
  }).trim();
}

/**
 * Get the main repo path from a worktree path.
 */
function getMainRepoPath(worktreePath: string): string {
  return execSync("git rev-parse --path-format=absolute --git-common-dir", {
    cwd: worktreePath,
    encoding: "utf-8",
  })
    .trim()
    .replace(/\/.git$/, "");
}

/**
 * Rebase a worktree branch onto the current HEAD of the target branch.
 *
 * If the rebase conflicts, it is aborted and the branch is left unchanged.
 *
 * @param worktreePath - Path to the worktree directory
 * @param targetBranch - The branch to rebase onto (e.g., "main")
 * @returns RebaseResult indicating success or conflict
 */
export function rebaseWorktreeBranch(
  worktreePath: string,
  targetBranch: string,
): RebaseResult {
  const branch = getWorktreeBranch(worktreePath);
  const mainRepo = getMainRepoPath(worktreePath);

  // Fetch the latest target branch ref from the main repo
  // We need to use the target branch reference from the main repo
  const targetRef = execSync(`git rev-parse ${targetBranch}`, {
    cwd: mainRepo,
    encoding: "utf-8",
  }).trim();

  try {
    // Rebase the worktree branch onto the target
    execSync(`git rebase ${targetRef}`, {
      cwd: worktreePath,
      stdio: "pipe",
    });

    return {
      success: true,
      conflicted: false,
      branch,
    };
  } catch (err) {
    // Rebase failed — likely conflicts
    // Abort the rebase to leave the branch in a clean state
    try {
      execSync("git rebase --abort", {
        cwd: worktreePath,
        stdio: "pipe",
      });
    } catch {
      // Abort may fail if rebase wasn't actually in progress
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      conflicted: true,
      branch,
      error: `Rebase of ${branch} onto ${targetBranch} failed: ${errorMsg}`,
    };
  }
}

/**
 * Merge a single branch into the current HEAD of the main repo.
 *
 * This is the isolated merge strategy function. The git merge command lives here
 * and ONLY here. Changing from `git merge` to `git rebase` (or any other strategy)
 * should only require modifying this one function.
 *
 * Behavior:
 * - If the merge is clean: commits the merge and returns success=true.
 * - If the merge has conflicts: leaves conflict markers on disk, does NOT commit,
 *   and returns conflicted=true with the list of conflicted files.
 * - If the merge fails for a non-conflict reason: returns success=false with error.
 *
 * @param mainRepoPath - Path to the main repository (where the merge happens)
 * @param branch - The branch name to merge into current HEAD
 * @returns MergeBranchResult with conflict details if applicable
 */
export function mergeSingleBranch(
  mainRepoPath: string,
  branch: string,
): MergeBranchResult {
  try {
    // Attempt git merge --no-commit to allow inspection before committing
    execSync(`git merge ${branch} --no-commit --no-ff`, {
      cwd: mainRepoPath,
      stdio: "pipe",
      env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
    });

    // Merge succeeded cleanly — sanitize protected files and commit
    const stagedFiles = execSync("git diff --cached --name-only HEAD", {
      cwd: mainRepoPath,
      encoding: "utf-8",
    }).trim().split("\n").filter(Boolean);

    const protectedFiles = getProtectedFiles(stagedFiles);

    if (protectedFiles.length > 0) {
      for (const pf of protectedFiles) {
        try {
          execSync(`git reset HEAD -- "${pf}"`, {
            cwd: mainRepoPath,
            stdio: "pipe",
          });
          const fullPath = join(mainRepoPath, pf);
          if (existsSync(fullPath)) {
            try {
              execSync(`git show HEAD:"${pf}"`, {
                cwd: mainRepoPath,
                stdio: "pipe",
              });
              execSync(`git checkout HEAD -- "${pf}"`, {
                cwd: mainRepoPath,
                stdio: "pipe",
              });
            } catch {
              unlinkSync(fullPath);
              try {
                const dir = dirname(fullPath);
                if (readdirSync(dir).length === 0) {
                  rmSync(dir);
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // Best effort
        }
      }
    }

    // Commit the clean merge
    execSync(`git commit --no-edit -m "Merge branch '${branch}'"`, {
      cwd: mainRepoPath,
      stdio: "pipe",
      env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
    });

    return {
      success: true,
      conflicted: false,
      branch,
    };
  } catch (err) {
    // Check if this is a conflict (merge in progress with conflicted files)
    try {
      const conflictedOutput = execSync(
        "git diff --name-only --diff-filter=U",
        {
          cwd: mainRepoPath,
          encoding: "utf-8",
        },
      ).trim();

      if (conflictedOutput.length > 0) {
        const conflictedFiles = conflictedOutput.split("\n").filter(Boolean);
        return {
          success: false,
          conflicted: true,
          branch,
          conflictedFiles,
        };
      }
    } catch {
      // Could not determine conflict status — fall through to generic error
    }

    // Non-conflict failure — abort any in-progress merge and return error
    try {
      execSync("git merge --abort", {
        cwd: mainRepoPath,
        stdio: "pipe",
      });
    } catch {
      // May not be in a merge state
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      conflicted: false,
      branch,
      error: `Merge of ${branch} failed: ${errorMsg}`,
    };
  }
}

/**
 * Rebase and merge multiple worktree branches into the target branch sequentially.
 *
 * For each worktree:
 * 0. Sanitize the worktree (remove protected files, node_modules, commit uncommitted work)
 * 1. Rebase the worktree branch onto the current HEAD of the target branch
 * 2. If rebase succeeds, merge into the target using mergeSingleBranch()
 * 3. If merge has conflicts, record the failure with conflict details
 * 4. If merge succeeds, continue with the next branch
 *
 * Before any worktree processing:
 * - Sanitize the main repo (stash uncommitted changes, remove node_modules from tracking)
 *
 * After all merges:
 * - Restore stashed changes on main
 *
 * This ensures each subsequent branch is rebased onto the latest state of the target,
 * which includes all previously merged branches.
 *
 * @param worktreePaths - Paths to worktree directories to merge
 * @param mainRepoPath - Path to the main repository
 * @param targetBranch - The branch to merge into (e.g., "main")
 * @returns MergeResult with details of merged and failed branches, plus per-branch results
 */
export function rebaseAndMerge(
  worktreePaths: string[],
  mainRepoPath: string,
  targetBranch: string,
): MergeResult {
  const mergedBranches: string[] = [];
  const failedBranches: string[] = [];
  const errors: string[] = [];
  const branchResults: MergeBranchResult[] = [];

  // Pre-merge: Sanitize the main repo (stash uncommitted changes)
  const mainSanitize = sanitizeMainRepo(mainRepoPath);
  if (!mainSanitize.success) {
    return {
      success: false,
      mergedBranches: [],
      failedBranches: worktreePaths.map((p) => {
        try { return getWorktreeBranch(p); } catch { return p; }
      }),
      errors: [`Main repo sanitization failed: ${mainSanitize.error}`],
      branchResults: [],
    };
  }

  try {
    for (const wtPath of worktreePaths) {
      const branch = getWorktreeBranch(wtPath);

      // Step 0: Sanitize the worktree before rebase
      const sanitizeResult = sanitizeWorktree(wtPath);
      if (!sanitizeResult.success) {
        const dirtyInfo = sanitizeResult.remainingDirtyFiles?.length
          ? `: dirty files: ${sanitizeResult.remainingDirtyFiles.join(", ")}`
          : "";
        const errorMsg = sanitizeResult.error ??
          `Worktree sanitization failed for ${branch}${dirtyInfo}`;
        failedBranches.push(branch);
        errors.push(errorMsg);
        branchResults.push({
          success: false,
          conflicted: false,
          branch,
          error: errorMsg,
        });
        continue;
      }

      // Step 1: Try rebasing onto current target HEAD for a clean linear history.
      // If rebase fails (conflicts), fall back to direct merge which handles
      // 3-way conflicts better and leaves conflict markers on disk.
      const rebaseResult = rebaseWorktreeBranch(wtPath, targetBranch);

      // Step 2: Merge the branch into target using the isolated merge strategy.
      // If rebase succeeded, this will be a clean fast-forward-like merge.
      // If rebase failed, we skip it and try a direct 3-way merge instead,
      // which can detect and report conflicts properly.
      const mergeResult = mergeSingleBranch(mainRepoPath, branch);
      branchResults.push(mergeResult);

      if (mergeResult.success) {
        mergedBranches.push(branch);
      } else {
        failedBranches.push(branch);
        if (mergeResult.conflicted) {
          const conflictFiles = mergeResult.conflictedFiles?.join(", ") ?? "unknown files";
          errors.push(`Merge of ${branch} has conflicts in: ${conflictFiles}`);
        } else {
          errors.push(mergeResult.error ?? `Merge of ${branch} failed`);
        }
      }
    }
  } finally {
    // Post-merge: Restore stashed changes on main
    if (mainSanitize.stashed) {
      unstashMainRepo(mainRepoPath);
    }
  }

  return {
    success: failedBranches.length === 0,
    mergedBranches,
    failedBranches,
    errors,
    branchResults,
  };
}
