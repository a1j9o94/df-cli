import { execSync } from "node:child_process";
import { sanitizedMerge } from "./merge-sanitization.js";

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
 * 1. Rebase the worktree branch onto the current HEAD of the target branch
 * 2. If rebase succeeds, merge into the target branch
 * 3. If rebase fails (conflicts), record the failure and continue with remaining branches
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

  for (const wtPath of worktreePaths) {
    const branch = getWorktreeBranch(wtPath);

    // Step 1: Rebase onto current target HEAD
    const rebaseResult = rebaseWorktreeBranch(wtPath, targetBranch);

    if (!rebaseResult.success) {
      failedBranches.push(branch);
      errors.push(rebaseResult.error ?? `Rebase of ${branch} failed`);
      continue;
    }

    // Step 2: Merge the rebased branch into target using sanitized merge
    // This automatically strips .df/state.db*, .claude/, .letta/ files
    const mergeResult2 = sanitizedMerge(mainRepoPath, branch);
    if (mergeResult2.success) {
      mergedBranches.push(branch);
    } else {
      failedBranches.push(branch);
      errors.push(mergeResult2.error ?? `Merge of ${branch} into ${targetBranch} failed`);
    }
  }

  return {
    success: failedBranches.length === 0,
    mergedBranches,
    failedBranches,
    errors,
  };
}
