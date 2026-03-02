/**
 * Protected paths that must never be committed from worktrees or merged into the main repo.
 *
 * This is the single source of truth for file patterns that worktree isolation
 * must exclude. Adding a new pattern here automatically updates:
 * - Worktree .gitignore generation
 * - Merge sanitization (files stripped before merge)
 * - Pre-commit hook validation
 *
 * Contract: ProtectedPathsAPI
 */

/**
 * Glob patterns for files that must be excluded from worktree commits and merges.
 * These patterns follow .gitignore syntax.
 */
export const PROTECTED_PATTERNS: readonly string[] = Object.freeze([
  ".df/state.db",
  ".df/state.db-shm",
  ".df/state.db-wal",
  ".df/state.db-journal",
  ".df/state.db.backup",
  ".df/worktrees/",
  ".df/logs/",
  ".claude/",
  ".letta/",
]);

/**
 * Generates .gitignore content for a worktree that excludes all protected paths.
 * This is written to the worktree root when a worktree is created.
 */
export function generateWorktreeGitignore(): string {
  const lines = [
    "# Dark Factory worktree isolation — auto-generated",
    "# DO NOT EDIT: This file is managed by the Dark Factory pipeline.",
    "# Protected paths are defined in src/runtime/protected-paths.ts",
    "",
    ...PROTECTED_PATTERNS,
    "",
  ];
  return lines.join("\n");
}

/**
 * Checks if a file path matches any protected pattern.
 * Used during merge sanitization and pre-commit validation.
 *
 * @param filePath - Relative path from repo root (e.g., ".df/state.db-shm")
 * @returns true if the path is protected and must not be committed/merged
 */
export function isProtectedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  for (const pattern of PROTECTED_PATTERNS) {
    // Directory patterns (ending with /)
    if (pattern.endsWith("/")) {
      const dirPrefix = pattern.slice(0, -1); // remove trailing /
      if (normalized === dirPrefix || normalized.startsWith(`${dirPrefix}/`) || normalized.startsWith(pattern)) {
        return true;
      }
    }
    // Glob patterns with wildcard (e.g., "state.db*" behavior via prefix matching)
    // .df/state.db matches .df/state.db, .df/state.db-shm, .df/state.db-wal, etc.
    else if (normalized === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a list of file paths, removing any that match protected patterns.
 *
 * @param files - Array of relative file paths
 * @returns Array with protected paths removed
 */
export function filterProtectedFiles(files: string[]): string[] {
  return files.filter((f) => !isProtectedPath(f));
}

/**
 * Returns all protected file paths that appear in a list of file paths.
 * Useful for reporting which files were blocked.
 *
 * @param files - Array of relative file paths
 * @returns Array of paths that match protected patterns
 */
export function getProtectedFiles(files: string[]): string[] {
  return files.filter((f) => isProtectedPath(f));
}
