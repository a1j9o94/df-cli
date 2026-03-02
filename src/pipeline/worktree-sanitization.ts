import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PROTECTED_PATTERNS, isProtectedPath } from "../runtime/protected-paths.js";

/**
 * Result of sanitizing a worktree before rebase.
 */
export interface SanitizeWorktreeResult {
  success: boolean;
  /** Whether a sanitization commit was created */
  committed: boolean;
  /** Protected files that were removed from git tracking */
  removedProtectedFiles: string[];
  /** Whether node_modules was deleted */
  removedNodeModules: boolean;
  /** Error description if sanitization failed */
  error?: string;
  /** Files that remain dirty after sanitization (should be empty on success) */
  remainingDirtyFiles?: string[];
}

/**
 * Result of sanitizing the main repo before merge.
 */
export interface SanitizeMainRepoResult {
  success: boolean;
  /** Whether changes were stashed */
  stashed: boolean;
  /** Whether node_modules were removed from git tracking */
  removedNodeModules: boolean;
  error?: string;
}

/**
 * Sanitize a worktree before rebase. This ensures the working tree is clean
 * so that `git rebase` won't refuse to run.
 *
 * Steps:
 * 1. Remove node_modules/ from the worktree filesystem
 * 2. Remove protected files from git tracking (git rm --cached)
 * 3. Discard changes to .claude/ and .letta/ files
 * 4. git add -A any remaining unstaged changes
 * 5. If there are staged changes, commit them
 * 6. Verify git status --porcelain is empty
 * 7. If still dirty, fail with a clear error
 *
 * @param worktreePath - Path to the builder's worktree
 * @returns SanitizeWorktreeResult
 */
export function sanitizeWorktree(worktreePath: string): SanitizeWorktreeResult {
  const removedProtectedFiles: string[] = [];
  let committed = false;
  let removedNodeModules = false;

  try {
    // Step 1: Remove node_modules/ from filesystem
    const nodeModulesPath = join(worktreePath, "node_modules");
    if (existsSync(nodeModulesPath)) {
      rmSync(nodeModulesPath, { recursive: true, force: true });
      removedNodeModules = true;
    }

    // Step 2: Remove .claude/ and .letta/ directories from the filesystem
    // These are config directories that should never be merged — just delete them.
    // This must happen BEFORE we remove protected files from git, so that
    // git rm --cached doesn't leave orphaned working-tree copies.
    removeConfigDir(worktreePath, ".claude");
    removeConfigDir(worktreePath, ".letta");

    // Step 3: Find and remove ALL protected files from git tracking
    // This covers: .df/state.db*, .claude/*, .letta/*, node_modules/*, dist/*, etc.
    const trackedFiles = getTrackedFiles(worktreePath);
    const protectedTracked = trackedFiles.filter((f) => isProtectedPath(f));

    for (const file of protectedTracked) {
      try {
        execSync(`git rm --cached -f "${file}"`, {
          cwd: worktreePath,
          stdio: "pipe",
        });
        removedProtectedFiles.push(file);
      } catch {
        // File might not be tracked, try to just unstage it
        try {
          execSync(`git reset HEAD -- "${file}"`, {
            cwd: worktreePath,
            stdio: "pipe",
          });
          removedProtectedFiles.push(file);
        } catch {
          // Best effort — continue with others
        }
      }

      // Also remove from the working tree so git add -A won't re-add it
      const absPath = join(worktreePath, file);
      if (existsSync(absPath)) {
        try {
          rmSync(absPath, { force: true });
        } catch {
          // Best effort
        }
      }
    }

    // Also check staged-but-not-committed files for protected patterns
    const stagedFiles = getStagedFiles(worktreePath);
    for (const file of stagedFiles) {
      if (isProtectedPath(file) && !removedProtectedFiles.includes(file)) {
        try {
          execSync(`git rm --cached -f "${file}"`, {
            cwd: worktreePath,
            stdio: "pipe",
          });
          removedProtectedFiles.push(file);
        } catch {
          try {
            execSync(`git reset HEAD -- "${file}"`, {
              cwd: worktreePath,
              stdio: "pipe",
            });
            removedProtectedFiles.push(file);
          } catch {
            // Best effort
          }
        }

        // Also remove from working tree
        const absPath = join(worktreePath, file);
        if (existsSync(absPath)) {
          try {
            rmSync(absPath, { force: true });
          } catch {
            // Best effort
          }
        }
      }
    }

    // Step 4: git add -A any remaining unstaged changes (real builder work)
    execSync("git add -A", {
      cwd: worktreePath,
      stdio: "pipe",
    });

    // Step 5: If there are staged changes, commit them
    const hasStaged = hasStagedChanges(worktreePath);
    if (hasStaged) {
      execSync('git commit -m "df: sanitize worktree before merge"', {
        cwd: worktreePath,
        stdio: "pipe",
      });
      committed = true;
    }

    // Step 6: Verify clean
    const dirtyFiles = getDirtyFiles(worktreePath);
    if (dirtyFiles.length > 0) {
      return {
        success: false,
        committed,
        removedProtectedFiles,
        removedNodeModules,
        error: `Worktree still dirty after sanitization: ${dirtyFiles.join(", ")}`,
        remainingDirtyFiles: dirtyFiles,
      };
    }

    return {
      success: true,
      committed,
      removedProtectedFiles,
      removedNodeModules,
    };
  } catch (err) {
    return {
      success: false,
      committed,
      removedProtectedFiles,
      removedNodeModules,
      error: `Sanitization failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Sanitize the main repo before merging builder branches into it.
 *
 * Steps:
 * 1. If main has uncommitted changes, stash them
 * 2. Remove any node_modules/ from git tracking
 *
 * After all merges complete, call `unstashMainRepo()` to restore stashed changes.
 *
 * @param mainRepoPath - Path to the main repository
 * @returns SanitizeMainRepoResult
 */
export function sanitizeMainRepo(mainRepoPath: string): SanitizeMainRepoResult {
  let stashed = false;
  let removedNodeModules = false;

  try {
    // Step 1: Stash uncommitted changes if any
    const dirtyFiles = getDirtyFiles(mainRepoPath);
    if (dirtyFiles.length > 0) {
      execSync('git stash push -m "df: pre-merge stash"', {
        cwd: mainRepoPath,
        stdio: "pipe",
      });
      stashed = true;
    }

    // Step 2: Remove node_modules from git tracking if present
    const trackedFiles = getTrackedFiles(mainRepoPath);
    const nodeModulesTracked = trackedFiles.filter((f) =>
      f.startsWith("node_modules/"),
    );
    if (nodeModulesTracked.length > 0) {
      for (const f of nodeModulesTracked) {
        try {
          execSync(`git rm --cached -f "${f}"`, {
            cwd: mainRepoPath,
            stdio: "pipe",
          });
        } catch {
          // Best effort
        }
      }
      // Commit the removal
      try {
        execSync(
          'git commit -m "df: remove node_modules from tracking before merge"',
          {
            cwd: mainRepoPath,
            stdio: "pipe",
          },
        );
      } catch {
        // Nothing to commit — that's fine
      }
      removedNodeModules = true;
    }

    return {
      success: true,
      stashed,
      removedNodeModules,
    };
  } catch (err) {
    return {
      success: false,
      stashed,
      removedNodeModules,
      error: `Main repo sanitization failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Pop stashed changes from the main repo after merges complete.
 *
 * @param mainRepoPath - Path to the main repository
 * @returns true if stash was popped successfully (or nothing to pop)
 */
export function unstashMainRepo(mainRepoPath: string): boolean {
  try {
    // Check if there's a stash to pop
    const stashList = execSync("git stash list", {
      cwd: mainRepoPath,
      encoding: "utf-8",
    }).trim();

    if (stashList.includes("df: pre-merge stash")) {
      execSync("git stash pop", {
        cwd: mainRepoPath,
        stdio: "pipe",
      });
    }
    return true;
  } catch {
    return false;
  }
}

// --- Internal helpers ---

/**
 * Get list of files tracked by git.
 */
function getTrackedFiles(dir: string): string[] {
  try {
    const output = execSync("git ls-files", {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

/**
 * Get list of staged (but not yet committed) files.
 */
function getStagedFiles(dir: string): string[] {
  try {
    const output = execSync("git diff --cached --name-only", {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

/**
 * Check if there are staged changes ready to commit.
 */
function hasStagedChanges(dir: string): boolean {
  try {
    execSync("git diff --cached --quiet", {
      cwd: dir,
      stdio: "pipe",
    });
    return false; // Exit 0 = no changes
  } catch {
    return true; // Exit 1 = has changes
  }
}

/**
 * Get list of dirty files (untracked, modified, staged).
 */
function getDirtyFiles(dir: string): string[] {
  try {
    const output = execSync("git status --porcelain", {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n").map((l) => l.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a config directory (.claude/, .letta/) from the working tree.
 * These are protected paths that should never be merged — just delete them
 * from the filesystem. The git rm --cached step happens separately in the
 * protected files removal loop.
 */
function removeConfigDir(worktreePath: string, dirName: string): void {
  const dirPath = join(worktreePath, dirName);
  if (!existsSync(dirPath)) return;

  try {
    rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Best effort
  }
}
