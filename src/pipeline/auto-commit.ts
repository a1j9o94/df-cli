import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface AutoCommitResult {
  success: boolean;
  error?: string;
}

/**
 * Automatically git-add and commit a single file.
 *
 * Used by `dark spec create` and `dark scenario create` to ensure
 * these files are tracked in git history even if the state DB is corrupted.
 * This is the "belt and suspenders" approach: specs live in both DB and git.
 *
 * Only stages the specified file — does NOT affect other unstaged changes.
 *
 * @param repoDir - Git repository root
 * @param relativePath - Path relative to repoDir (e.g., "specs/spec_01.md")
 * @param commitMessage - Commit message
 */
export function autoCommitFile(
  repoDir: string,
  relativePath: string,
  commitMessage: string,
): AutoCommitResult {
  const absPath = join(repoDir, relativePath);

  if (!existsSync(absPath)) {
    return {
      success: false,
      error: `File not found: ${absPath}`,
    };
  }

  try {
    // Verify we're in a git repo
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: repoDir,
      stdio: "pipe",
    });
  } catch {
    return {
      success: false,
      error: `Not a git repository: ${repoDir}`,
    };
  }

  try {
    // Stage only this specific file
    execSync(`git add "${relativePath}"`, {
      cwd: repoDir,
      stdio: "pipe",
    });

    // Commit only this file
    execSync(`git commit -m "${commitMessage}" -- "${relativePath}"`, {
      cwd: repoDir,
      stdio: "pipe",
    });

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Auto-commit failed: ${err.message ?? String(err)}`,
    };
  }
}
