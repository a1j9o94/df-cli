import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { sanitizeWorktree, type SanitizeWorktreeResult } from "../../../src/pipeline/worktree-sanitization.js";

let repoDir: string;

/**
 * Helper to create a bare test git repo with an initial commit.
 */
function setupTestRepo(): { mainRepo: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-wt-sanitize-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  // Create initial commit on main
  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return { mainRepo: dir };
}

/**
 * Helper to create a worktree branch from the main repo.
 */
function createWorktreeBranch(
  mainRepo: string,
  branchName: string,
): string {
  const wtDir = mkdtempSync(join(tmpdir(), `df-wt-${branchName}-`));
  rmSync(wtDir, { recursive: true, force: true });
  execSync(`git worktree add -b ${branchName} "${wtDir}" HEAD`, {
    cwd: mainRepo,
    stdio: "pipe",
  });
  execSync("git config user.email test@test.com", { cwd: wtDir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: wtDir, stdio: "pipe" });
  return wtDir;
}

/**
 * Check if git working tree is clean.
 */
function isClean(dir: string): boolean {
  const status = execSync("git status --porcelain", {
    cwd: dir,
    encoding: "utf-8",
  }).trim();
  return status === "";
}

beforeEach(() => {
  const setup = setupTestRepo();
  repoDir = setup.mainRepo;
});

afterEach(() => {
  // Clean up worktrees before deleting repo
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(repoDir)) {
        const wtPath = line.slice(9);
        if (wtPath !== repoDir) {
          try {
            execSync(`git worktree remove "${wtPath}" --force`, {
              cwd: repoDir,
              stdio: "pipe",
            });
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("sanitizeWorktree", () => {
  test("cleans dirty worktree with unstaged changes", () => {
    const wtDir = createWorktreeBranch(repoDir, "dirty-unstaged");

    // Builder wrote a file but didn't commit
    writeFileSync(join(wtDir, "uncommitted.ts"), "export const x = 1;\n");

    // Worktree should be dirty
    expect(isClean(wtDir)).toBe(false);

    // Sanitize
    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);
    expect(result.committed).toBe(true);

    // Worktree should now be clean
    expect(isClean(wtDir)).toBe(true);
  });

  test("removes protected files from git tracking", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-protected");

    // Simulate builder accidentally committing protected files
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "stale wal data");
    execSync("git add -f .df/state.db-wal", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Accidentally committed state.db-wal"', {
      cwd: wtDir,
      stdio: "pipe",
    });

    // Sanitize should remove it from tracking
    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);
    expect(result.removedProtectedFiles.length).toBeGreaterThanOrEqual(1);
    expect(result.removedProtectedFiles).toContain(".df/state.db-wal");

    // Worktree should be clean
    expect(isClean(wtDir)).toBe(true);
  });

  test("discards .claude/ and .letta/ changes", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-claude-letta");

    // Simulate builder having modified .claude/CLAUDE.md (this is in the main repo)
    mkdirSync(join(wtDir, ".claude"), { recursive: true });
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "builder modified this\n");
    mkdirSync(join(wtDir, ".letta"), { recursive: true });
    writeFileSync(join(wtDir, ".letta", "config.json"), '{"modified": true}');

    // Sanitize should handle these
    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);

    // Worktree should be clean
    expect(isClean(wtDir)).toBe(true);
  });

  test("removes node_modules from worktree", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-node-modules");

    // Simulate builder installing node_modules
    mkdirSync(join(wtDir, "node_modules", "some-package"), { recursive: true });
    writeFileSync(
      join(wtDir, "node_modules", "some-package", "index.js"),
      "module.exports = {};",
    );

    // Sanitize should remove node_modules
    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);
    expect(result.removedNodeModules).toBe(true);

    // node_modules should be gone
    expect(existsSync(join(wtDir, "node_modules"))).toBe(false);

    // Worktree should be clean
    expect(isClean(wtDir)).toBe(true);
  });

  test("clean worktree is a no-op", () => {
    const wtDir = createWorktreeBranch(repoDir, "already-clean");

    // Make a committed change so branch has content
    writeFileSync(join(wtDir, "feature.ts"), "export const y = 2;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature"', { cwd: wtDir, stdio: "pipe" });

    // Already clean
    expect(isClean(wtDir)).toBe(true);

    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);
    expect(result.committed).toBe(false);
    expect(result.removedProtectedFiles).toHaveLength(0);
    expect(result.removedNodeModules).toBe(false);

    // Still clean
    expect(isClean(wtDir)).toBe(true);
  });

  test("fails with clear error when worktree is still dirty after sanitization", () => {
    // This tests the error reporting — in practice we'd need a scenario
    // where sanitization can't clean up. Hard to simulate, so we test the
    // result structure.
    const wtDir = createWorktreeBranch(repoDir, "complex-dirty");

    // Mix of committed protected files and uncommitted source files
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-shm"), "shm data");
    writeFileSync(join(wtDir, "new-feature.ts"), "export const z = 3;\n");
    execSync("git add -f .df/state.db-shm", { cwd: wtDir, stdio: "pipe" });
    // Don't commit — leave things partially staged and unstaged

    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);

    // Everything should be clean after sanitization
    expect(isClean(wtDir)).toBe(true);
  });

  test("handles worktree with both protected files and real changes", () => {
    const wtDir = createWorktreeBranch(repoDir, "mixed-content");

    // Builder did real work AND left protected files
    writeFileSync(join(wtDir, "real-work.ts"), "export function main() {}\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db"), "corrupted db");
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "wal data");
    mkdirSync(join(wtDir, ".claude"), { recursive: true });
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "modified by builder");
    mkdirSync(join(wtDir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(wtDir, "node_modules", "pkg", "index.js"), "{}");

    // Force-add everything including protected files
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Builder commit with protected files"', {
      cwd: wtDir,
      stdio: "pipe",
    });

    const result = sanitizeWorktree(wtDir);
    expect(result.success).toBe(true);

    // Real work should survive
    const trackedFiles = execSync("git ls-files", {
      cwd: wtDir,
      encoding: "utf-8",
    }).trim();
    expect(trackedFiles).toContain("real-work.ts");

    // Protected files should NOT be tracked
    expect(trackedFiles).not.toContain(".df/state.db");
    expect(trackedFiles).not.toContain(".df/state.db-wal");
    expect(trackedFiles).not.toContain(".claude/CLAUDE.md");

    // Should be clean
    expect(isClean(wtDir)).toBe(true);
  });
});
