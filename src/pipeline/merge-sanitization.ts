import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * File path patterns that must never be included in merges.
 * These are matched against file paths relative to the repo root.
 */
export const FORBIDDEN_MERGE_PATTERNS: readonly string[] = [
  ".df/state.db",
  ".claude/",
  ".letta/",
] as const;

/**
 * Result of a sanitized merge operation.
 */
export interface SanitizedMergeResult {
  success: boolean;
  removedFiles: string[];
  error?: string;
}

/**
 * Check if a file path matches any forbidden merge pattern.
 */
export function isForbiddenPath(filePath: string): boolean {
  for (const pattern of FORBIDDEN_MERGE_PATTERNS) {
    if (filePath.startsWith(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Merge a branch into the current branch of mainRepoPath,
 * automatically stripping any forbidden files from the merge result.
 *
 * Uses `git merge --no-commit` to stage the merge, then removes
 * any forbidden files from the staging area before committing.
 *
 * @param mainRepoPath - Path to the main repo (target of merge)
 * @param branch - Branch name to merge in
 * @returns Result with success status and list of removed files
 */
export function sanitizedMerge(
  mainRepoPath: string,
  branch: string,
): SanitizedMergeResult {
  const removedFiles: string[] = [];

  try {
    // Step 1: Attempt merge with --no-commit to stage changes
    try {
      execSync(`git merge ${branch} --no-commit --no-ff`, {
        cwd: mainRepoPath,
        stdio: "pipe",
        env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
      });
    } catch (mergeErr: any) {
      // Check if this is a conflict or just a non-zero exit
      const status = execSync("git status --porcelain", {
        cwd: mainRepoPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      // If there are UU (unmerged) entries, we have a real conflict
      if (status.includes("UU ") || status.includes("AA ") || status.includes("DD ")) {
        // Abort the merge
        try {
          execSync("git merge --abort", { cwd: mainRepoPath, stdio: "pipe" });
        } catch {
          /* ignore */
        }
        return {
          success: false,
          removedFiles: [],
          error: `Merge conflict with branch ${branch}: ${mergeErr.message ?? ""}`,
        };
      }
      // If no conflicts detected, the merge may have succeeded (non-zero exit can happen with --no-commit)
    }

    // Step 2: Check staged files for forbidden patterns
    const stagedOutput = execSync("git diff --cached --name-only", {
      cwd: mainRepoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const stagedFiles = stagedOutput.split("\n").filter((f) => f.length > 0);

    // Also check newly added files
    const statusOutput = execSync("git diff --cached --name-status", {
      cwd: mainRepoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Step 3: Remove forbidden files from the staging area AND working tree
    for (const file of stagedFiles) {
      if (isForbiddenPath(file)) {
        try {
          // Remove from git index
          execSync(`git rm --cached -f "${file}"`, {
            cwd: mainRepoPath,
            stdio: "pipe",
          });
        } catch {
          // Try reset as fallback
          try {
            execSync(`git reset HEAD -- "${file}"`, {
              cwd: mainRepoPath,
              stdio: "pipe",
            });
          } catch {
            /* best effort */
          }
        }

        // Also remove the file from the working tree
        const absPath = join(mainRepoPath, file);
        if (existsSync(absPath)) {
          try {
            unlinkSync(absPath);
          } catch {
            /* best effort */
          }
        }

        removedFiles.push(file);
      }
    }

    // Step 4: Commit the sanitized merge
    try {
      execSync(`git commit --no-edit`, {
        cwd: mainRepoPath,
        stdio: "pipe",
        env: { ...process.env, GIT_WORK_TREE: mainRepoPath },
      });
    } catch {
      // If commit fails (maybe nothing left to commit after removing forbidden files),
      // check if we're in a merge state and abort
      try {
        execSync("git merge --abort", { cwd: mainRepoPath, stdio: "pipe" });
      } catch {
        /* ignore */
      }

      // Check if the merge made no meaningful changes
      return {
        success: true,
        removedFiles,
      };
    }

    return {
      success: true,
      removedFiles,
    };
  } catch (err: any) {
    // Abort any in-progress merge
    try {
      execSync("git merge --abort", { cwd: mainRepoPath, stdio: "pipe" });
    } catch {
      /* ignore */
    }

    return {
      success: false,
      removedFiles,
      error: `Merge of ${branch} failed: ${err.message ?? String(err)}`,
    };
  }
}
