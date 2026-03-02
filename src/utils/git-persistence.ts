// src/utils/git-persistence.ts
// Guard 5: Git commit files immediately on creation (belt-and-suspenders approach)
// Ensures spec and scenario files survive even if the DB is corrupted.

import { execSync } from "node:child_process";
import { log } from "./logger.js";

/**
 * Git add and commit a file immediately after creation.
 * This is a best-effort operation — if git is not available or the
 * project is not a git repo, it logs a warning but does not throw.
 *
 * @param repoRoot - The root directory of the git repository
 * @param relativePath - The file path relative to repoRoot (e.g., ".df/specs/spec_001.md")
 * @param commitMessage - The commit message to use
 */
export function gitCommitFile(repoRoot: string, relativePath: string, commitMessage: string): void {
  try {
    // Check if we're in a git repo
    execSync("git rev-parse --git-dir", {
      cwd: repoRoot,
      stdio: "pipe",
    });
  } catch {
    log.debug(`Not a git repository at ${repoRoot}, skipping git commit for ${relativePath}`);
    return;
  }

  try {
    // Stage the file
    execSync(`git add "${relativePath}"`, {
      cwd: repoRoot,
      stdio: "pipe",
    });

    // Check if there are actually staged changes for this file
    const status = execSync(`git diff --cached --name-only`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!status) {
      // No changes to commit (file already committed with same content)
      log.debug(`No changes to commit for ${relativePath}`);
      return;
    }

    // Commit
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      stdio: "pipe",
    });

    log.debug(`Committed ${relativePath} to git`);
  } catch (err) {
    // Best-effort: log warning but don't throw
    log.warn(`Failed to git commit ${relativePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
