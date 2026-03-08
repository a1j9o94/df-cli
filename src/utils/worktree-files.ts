import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Count the number of files changed in a git worktree.
 * Uses `git diff --name-only` against the initial commit.
 * Returns 0 if the worktree doesn't exist or git fails.
 */
export function getWorktreeFilesChanged(worktreePath: string | null): number {
  if (!worktreePath) return 0;
  try {
    if (!existsSync(worktreePath)) return 0;
    const output = execSync(
      "git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD",
      {
        cwd: worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const files = output.trim().split("\n").filter(Boolean);
    return files.length;
  } catch {
    return 0;
  }
}
