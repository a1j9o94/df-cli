import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Patterns that must be excluded from worktree git operations.
 * These protect the main repo's state from corruption during merges.
 */
export const WORKTREE_GITIGNORE_PATTERNS: readonly string[] = [
  ".df/state.db*",
  ".df/worktrees/",
  ".df/logs/",
  ".claude/",
  ".letta/",
] as const;

/**
 * Header comment for the worktree-specific gitignore section.
 */
const GITIGNORE_HEADER =
  "# Dark Factory worktree isolation — DO NOT REMOVE\n# These patterns prevent state DB corruption during merges\n";

/**
 * Write (or append) worktree isolation patterns to a .gitignore file.
 *
 * If the file already exists, appends only missing patterns.
 * If it doesn't exist, creates it with all required patterns.
 */
export function writeWorktreeGitignore(dir: string): void {
  const gitignorePath = join(dir, ".gitignore");
  let existingContent = "";

  if (existsSync(gitignorePath)) {
    existingContent = readFileSync(gitignorePath, "utf-8");
  }

  const missingPatterns = WORKTREE_GITIGNORE_PATTERNS.filter(
    (pattern) => !existingContent.includes(pattern),
  );

  if (missingPatterns.length === 0) {
    return; // All patterns already present
  }

  const newSection = `\n${GITIGNORE_HEADER}${missingPatterns.join("\n")}\n`;
  writeFileSync(gitignorePath, existingContent + newSection);
}

/**
 * Result of worktree isolation verification.
 */
export interface IsolationVerification {
  valid: boolean;
  missingPatterns: string[];
}

/**
 * Verify that a worktree directory has proper isolation (all required
 * .gitignore patterns are in place).
 */
export function verifyWorktreeIsolation(dir: string): IsolationVerification {
  const gitignorePath = join(dir, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return {
      valid: false,
      missingPatterns: [...WORKTREE_GITIGNORE_PATTERNS],
    };
  }

  const content = readFileSync(gitignorePath, "utf-8");
  const missingPatterns = WORKTREE_GITIGNORE_PATTERNS.filter(
    (pattern) => !content.includes(pattern),
  );

  return {
    valid: missingPatterns.length === 0,
    missingPatterns,
  };
}
