import { execSync } from "node:child_process";
import { existsSync, unlinkSync, rmSync, readdirSync, readFileSync } from "node:fs";
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
  branchResults?: MergeBranchResult[];
}

/**
 * Scan a file for git conflict markers (<<<<<<, =======, >>>>>>>).
 * Returns true if any are found.
 */
export function scanConflictMarkers(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, "utf-8");
    return content.includes("<<<<<<<") && content.includes("=======") && content.includes(">>>>>>>");
  } catch {
    return false;
  }
}

/**
 * Result of attempting to merge a single branch into the target.
 *
 * Contract: MergeBranchResult
 *
 * - status "clean": merge succeeded without conflicts, commit was made
 * - status "conflicted": merge had conflicts; conflict markers are on disk,
 *   merge is in progress (not committed, not aborted)
 * - status "error": merge failed for a non-conflict reason
 */
export interface MergeBranchResult {
  /** Whether the merge completed successfully (clean merge committed) */
  success: boolean;
  /** The merge outcome: "clean", "conflicted", or "error" */
  status: "clean" | "conflicted" | "error";
  /** The branch name that was merged */
  branch: string;
  /** Conflicted files with their paths and content (only when status is "conflicted") */
  conflictedFiles?: { path: string; content: string }[];
  /** Error message (only when status is "error") */
  error?: string;
}

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
 * Rebase and merge multiple worktree branches into the target branch sequentially.
 *
 * For each worktree:
 * 0. Sanitize the worktree (remove protected files, node_modules, commit uncommitted work)
 * 1. Rebase the worktree branch onto the current HEAD of the target branch
 * 2. If rebase succeeds, merge into the target branch
 * 3. If rebase fails (conflicts), record the failure and continue with remaining branches
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
 * @returns MergeResult with details of merged and failed branches
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
    };
  }

  try {
    for (const wtPath of worktreePaths) {
      const branch = getWorktreeBranch(wtPath);

      // Step 0: Sanitize the worktree before rebase
      const sanitizeResult = sanitizeWorktree(wtPath);
      if (!sanitizeResult.success) {
        failedBranches.push(branch);
        const dirtyInfo = sanitizeResult.remainingDirtyFiles?.length
          ? `: dirty files: ${sanitizeResult.remainingDirtyFiles.join(", ")}`
          : "";
        const errorMsg = sanitizeResult.error ??
            `Worktree sanitization failed for ${branch}${dirtyInfo}`;
        errors.push(errorMsg);
        branchResults.push({
          success: false,
          status: "error",
          branch,
          error: errorMsg,
        });
        continue;
      }

      // Step 1: Rebase onto current target HEAD
      const rebaseResult = rebaseWorktreeBranch(wtPath, targetBranch);

      if (!rebaseResult.success) {
        // Rebase failed — likely conflicts with already-merged branches.
        // Fall through to try a direct merge, which will produce conflict markers
        // that a merger agent can resolve.
      }

      // Step 2: Merge the (possibly un-rebased) branch into target using --no-commit for sanitization
      try {
        // Use --no-commit so we can inspect and sanitize staged files before committing
        execSync(`git merge ${branch} --no-commit --no-ff`, {
          cwd: mainRepoPath,
          stdio: "pipe",
          env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
        });

        // Step 3: Sanitize — remove any protected files from the staged merge
        const stagedFiles = execSync("git diff --cached --name-only HEAD", {
          cwd: mainRepoPath,
          encoding: "utf-8",
        }).trim().split("\n").filter(Boolean);

        const protectedFiles = getProtectedFiles(stagedFiles);

        if (protectedFiles.length > 0) {
          // Unstage and remove protected files from the merge
          for (const pf of protectedFiles) {
            try {
              // Reset the file to the pre-merge state (HEAD version, or remove if new)
              execSync(`git reset HEAD -- "${pf}"`, {
                cwd: mainRepoPath,
                stdio: "pipe",
              });
              // Remove the file from the working directory if it was added by the merge
              const fullPath = join(mainRepoPath, pf);
              if (existsSync(fullPath)) {
                // Check if this file existed before the merge on the target branch
                try {
                  execSync(`git show HEAD:"${pf}"`, {
                    cwd: mainRepoPath,
                    stdio: "pipe",
                  });
                  // File existed before — restore it to its pre-merge state
                  execSync(`git checkout HEAD -- "${pf}"`, {
                    cwd: mainRepoPath,
                    stdio: "pipe",
                  });
                } catch {
                  // File did not exist before — remove it from working tree
                  unlinkSync(fullPath);
                  // Try to remove empty parent directories (non-recursive to avoid
                  // accidentally deleting directories that contain other files)
                  try {
                    const dir = dirname(fullPath);
                    // Only remove if directory is empty — non-recursive rmSync
                    if (readdirSync(dir).length === 0) {
                      rmSync(dir);
                    }
                  } catch {
                    // ignore — directory may not be empty or may not exist
                  }
                }
              }
            } catch {
              // If individual file cleanup fails, continue with others
            }
          }
        }

        // Step 4: Commit the sanitized merge
        execSync(`git commit --no-edit -m "Merge branch '${branch}'"`, {
          cwd: mainRepoPath,
          stdio: "pipe",
          env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
        });
        mergedBranches.push(branch);
        branchResults.push({
          success: true,
          status: "clean",
          branch,
        });
      } catch (err) {
        // Check if this is a conflict (merge in progress with unmerged files)
        let handled = false;
        try {
          const unmergedOutput = execSync("git diff --name-only --diff-filter=U", {
            cwd: mainRepoPath,
            encoding: "utf-8",
          }).trim();

          if (unmergedOutput.length > 0) {
            const conflictedPaths = unmergedOutput.split("\n").filter(Boolean);
            const conflictedFiles = conflictedPaths.map((filePath) => {
              let content = "";
              try {
                content = readFileSync(join(mainRepoPath, filePath), "utf-8");
              } catch {
                content = `(Could not read file: ${filePath})`;
              }
              return { path: filePath, content };
            });

            failedBranches.push(branch);
            errors.push(`Merge of ${branch} into ${targetBranch} conflicted`);
            branchResults.push({
              success: false,
              status: "conflicted",
              branch,
              conflictedFiles,
            });
            handled = true;
          }
        } catch {
          // If we can't check for unmerged files, fall through to generic error
        }

        if (!handled) {
          const errorMsg = err instanceof Error ? err.message : `Merge of ${branch} into ${targetBranch} failed`;
          failedBranches.push(branch);
          errors.push(errorMsg);
          branchResults.push({
            success: false,
            status: "error",
            branch,
            error: errorMsg,
          });
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

/**
 * Merge a single worktree branch into the target branch using `git merge --no-commit`.
 *
 * Contract: MergeSingleBranchFunction
 *
 * This function implements the conflict-detection-and-handoff strategy:
 * 1. Attempt `git merge --no-commit` for the branch
 * 2. If merge succeeds cleanly: commit and return status "clean"
 * 3. If merge has conflicts: list conflicted files with their content,
 *    leave the merge in progress (not committed, not aborted),
 *    and return status "conflicted"
 *
 * When status is "conflicted", the caller is responsible for either:
 * - Spawning a merger agent to resolve the conflicts, then committing
 * - Aborting the merge with `git merge --abort`
 *
 * @param worktreePath - Path to the worktree directory whose branch is being merged
 * @param mainRepoPath - Path to the main repository
 * @param targetBranch - The branch to merge into (e.g., "main")
 * @returns MergeBranchResult indicating clean merge, conflict, or error
 */
export function mergeSingleBranch(
  worktreePath: string,
  mainRepoPath: string,
  targetBranch: string,
): MergeBranchResult {
  const branch = getWorktreeBranch(worktreePath);

  try {
    // Attempt merge with --no-commit so we can inspect before committing
    execSync(`git merge ${branch} --no-commit --no-ff`, {
      cwd: mainRepoPath,
      stdio: "pipe",
      env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
    });

    // Merge succeeded cleanly — commit it
    execSync(`git commit --no-edit -m "Merge branch '${branch}'"`, {
      cwd: mainRepoPath,
      stdio: "pipe",
      env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
    });

    return {
      success: true,
      status: "clean",
      branch,
    };
  } catch (err) {
    // Check if this is a conflict (merge in progress with unmerged files)
    try {
      const unmergedOutput = execSync("git diff --name-only --diff-filter=U", {
        cwd: mainRepoPath,
        encoding: "utf-8",
      }).trim();

      if (unmergedOutput.length > 0) {
        // There are unmerged (conflicted) files — read their content
        const conflictedPaths = unmergedOutput.split("\n").filter(Boolean);
        const conflictedFiles = conflictedPaths.map((filePath) => {
          let content = "";
          try {
            content = readFileSync(join(mainRepoPath, filePath), "utf-8");
          } catch {
            content = `(Could not read file: ${filePath})`;
          }
          return { path: filePath, content };
        });

        return {
          success: false,
          status: "conflicted",
          branch,
          conflictedFiles,
        };
      }
    } catch {
      // If we can't even check for unmerged files, it's a general error
    }

    // Non-conflict error
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: "error",
      branch,
      error: `Merge of ${branch} into ${targetBranch} failed: ${errorMsg}`,
    };
  }
}
