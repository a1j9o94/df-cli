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

import {
  rebaseAndMerge,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-sanitize-merge-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

/**
 * Helper to create a worktree branch from the main repo.
 */
function createWorktreeBranch(mainRepo: string, branchName: string): string {
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

beforeEach(() => {
  repoDir = setupTestRepo();
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
    // ignore
  }
});

describe("rebaseAndMerge with pre-rebase sanitization", () => {
  test("scenario 1: dirty worktree auto-cleaned before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "dirty-builder");

    // Builder did work but didn't commit everything
    writeFileSync(join(wtDir, "committed.ts"), "export const a = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Builder work"', { cwd: wtDir, stdio: "pipe" });

    // Builder left uncommitted changes
    writeFileSync(join(wtDir, "uncommitted.ts"), "export const b = 2;\n");

    // Advance main
    writeFileSync(join(repoDir, "main-change.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repoDir, stdio: "pipe" });

    // Merge should succeed — dirty worktree should be auto-sanitized
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);

    // Both files should be in main
    expect(existsSync(join(repoDir, "committed.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "uncommitted.ts"))).toBe(true);
  });

  test("scenario 2: protected files removed before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-protected");

    // Builder committed both real work and protected files
    writeFileSync(join(wtDir, "feature.ts"), "export function feature() {}\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "stale wal data");
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature with state.db"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Feature should be in main
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // Protected files should NOT be in main
    expect(existsSync(join(repoDir, ".df", "state.db-wal"))).toBe(false);
  });

  test("scenario 3: node_modules removed before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-modules");

    // Builder installed and committed node_modules
    writeFileSync(join(wtDir, "app.ts"), "import x from 'x';\n");
    mkdirSync(join(wtDir, "node_modules", "x"), { recursive: true });
    writeFileSync(join(wtDir, "node_modules", "x", "index.js"), "module.exports = 1;");
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "App with node_modules"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // App code should be in main
    expect(existsSync(join(repoDir, "app.ts"))).toBe(true);

    // node_modules should NOT be in main
    expect(existsSync(join(repoDir, "node_modules"))).toBe(false);
  });

  test("scenario 4: clean worktree passes through normally", () => {
    const wtDir = createWorktreeBranch(repoDir, "clean-builder");

    writeFileSync(join(wtDir, "clean.ts"), "export const clean = true;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Clean feature"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);
    expect(existsSync(join(repoDir, "clean.ts"))).toBe(true);
  });

  test("scenario 5: main repo stashed and restored", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-main-dirty");

    // Builder makes a clean commit
    writeFileSync(join(wtDir, "feature.ts"), "export const f = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Builder feature"', { cwd: wtDir, stdio: "pipe" });

    // Main has uncommitted .claude/CLAUDE.md changes
    mkdirSync(join(repoDir, ".claude"), { recursive: true });
    writeFileSync(join(repoDir, ".claude", "CLAUDE.md"), "session config\n");

    // Merge should still succeed
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Feature merged in
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // .claude/CLAUDE.md should be restored from stash
    expect(existsSync(join(repoDir, ".claude", "CLAUDE.md"))).toBe(true);
    const content = readFileSync(join(repoDir, ".claude", "CLAUDE.md"), "utf-8");
    expect(content).toContain("session config");
  });

  test("scenario 6: multiple protected files + dirty .claude removed before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "multi-protected");

    // Builder committed protected files: .df/state.db-wal, .df/state.db-shm, .claude/CLAUDE.md
    writeFileSync(join(wtDir, "real-feature.ts"), "export const real = true;\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "stale wal data");
    writeFileSync(join(wtDir, ".df", "state.db-shm"), "stale shm data");
    mkdirSync(join(wtDir, ".claude"), { recursive: true });
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "builder modified this");
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature with protected files"', { cwd: wtDir, stdio: "pipe" });

    // Then builder modifies .claude/CLAUDE.md again without committing (unstaged change)
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "builder modified this again");

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Real feature should be in main
    expect(existsSync(join(repoDir, "real-feature.ts"))).toBe(true);

    // Protected files should NOT be in main
    expect(existsSync(join(repoDir, ".df", "state.db-wal"))).toBe(false);
    expect(existsSync(join(repoDir, ".df", "state.db-shm"))).toBe(false);

    // .claude/CLAUDE.md should NOT be in the merged result
    // (it was a protected path from the worktree, not from main)
    const trackedFiles = execSync("git ls-files", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(trackedFiles).not.toContain(".df/state.db");
    expect(trackedFiles).not.toContain(".claude/CLAUDE.md");
  });

  test("scenario 7: node_modules not tracked in git ls-files on main after merge", () => {
    const wtDir = createWorktreeBranch(repoDir, "modules-tracked");

    // Builder committed node_modules to git
    writeFileSync(join(wtDir, "index.ts"), "import pkg from 'pkg';\n");
    mkdirSync(join(wtDir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(wtDir, "node_modules", "pkg", "index.js"), "module.exports = 42;");
    mkdirSync(join(wtDir, "node_modules", ".package-lock.json"), { recursive: true });
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "App with tracked node_modules"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Real code should be in main
    expect(existsSync(join(repoDir, "index.ts"))).toBe(true);

    // node_modules should not exist on filesystem
    expect(existsSync(join(repoDir, "node_modules"))).toBe(false);

    // node_modules should not be tracked in git
    const trackedFiles = execSync("git ls-files", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(trackedFiles).not.toContain("node_modules/");
  });

  test("multiple dirty worktrees all get sanitized", () => {
    const wt1 = createWorktreeBranch(repoDir, "dirty-1");
    const wt2 = createWorktreeBranch(repoDir, "dirty-2");

    // Both builders leave uncommitted work
    writeFileSync(join(wt1, "feature1.ts"), "export const one = 1;\n");
    writeFileSync(join(wt2, "feature2.ts"), "export const two = 2;\n");
    // Don't commit — both are dirty

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // Both features should be in main
    expect(existsSync(join(repoDir, "feature1.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "feature2.ts"))).toBe(true);
  });

  test("protected files in merge staging are filtered out post-merge", () => {
    // This tests the post-merge sanitization step in rebaseAndMerge
    // where getProtectedFiles() filters staged files after --no-commit merge
    const wtDir = createWorktreeBranch(repoDir, "builder-with-claude");

    // Builder committed both real work AND .claude config changes
    writeFileSync(join(wtDir, "feature.ts"), "export const x = 1;\n");
    mkdirSync(join(wtDir, ".claude"), { recursive: true });
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "builder-specific config\n");
    mkdirSync(join(wtDir, ".letta"), { recursive: true });
    writeFileSync(join(wtDir, ".letta", "memory.json"), '{"key":"val"}\n');
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature plus config"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Feature should be in main
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // Protected config files should NOT be in main
    expect(existsSync(join(repoDir, ".claude", "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(repoDir, ".letta", "memory.json"))).toBe(false);
  });

  test("empty worktree list returns success with empty arrays", () => {
    const result = rebaseAndMerge([], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches).toEqual([]);
    expect(result.failedBranches).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("worktree with both uncommitted changes and protected files", () => {
    // Combined scenario: dirty worktree + protected files + node_modules
    const wtDir = createWorktreeBranch(repoDir, "messy-builder");

    // Builder committed some work
    writeFileSync(join(wtDir, "committed.ts"), "export const a = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Partial work"', { cwd: wtDir, stdio: "pipe" });

    // Then left uncommitted changes, protected files, AND node_modules
    writeFileSync(join(wtDir, "uncommitted.ts"), "export const b = 2;\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-shm"), "shared memory data");
    mkdirSync(join(wtDir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(wtDir, "node_modules", "pkg", "index.js"), "x");

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);

    // Real work should be in main
    expect(existsSync(join(repoDir, "committed.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "uncommitted.ts"))).toBe(true);

    // Protected files and node_modules should NOT be in main
    expect(existsSync(join(repoDir, ".df", "state.db-shm"))).toBe(false);
    expect(existsSync(join(repoDir, "node_modules"))).toBe(false);
  });

  test("sequential merges maintain correct state between worktrees", () => {
    // Test that when multiple worktrees are merged sequentially,
    // each successive rebase picks up the previous merge's changes
    const wt1 = createWorktreeBranch(repoDir, "builder-alpha");
    const wt2 = createWorktreeBranch(repoDir, "builder-beta");

    // Builder 1 creates a file
    writeFileSync(join(wt1, "alpha.ts"), "export const alpha = 'first';\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Alpha feature"', { cwd: wt1, stdio: "pipe" });

    // Builder 2 creates a different file
    writeFileSync(join(wt2, "beta.ts"), "export const beta = 'second';\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Beta feature"', { cwd: wt2, stdio: "pipe" });

    // Advance main with a change
    writeFileSync(join(repoDir, "main-update.txt"), "main advanced\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main advance"', { cwd: repoDir, stdio: "pipe" });

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // All files should be in main
    expect(existsSync(join(repoDir, "alpha.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "beta.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "main-update.txt"))).toBe(true);

    // Verify git log shows both merges
    const log = execSync("git log --oneline -5", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    expect(log).toContain("builder-alpha");
    expect(log).toContain("builder-beta");
  });

  test("unstashMainRepo runs even when worktree processing throws", () => {
    // This tests the finally block behavior: unstashMainRepo should
    // always be called, even if worktree processing hits an unexpected error
    const wtDir = createWorktreeBranch(repoDir, "crash-builder");

    // Builder makes a clean commit
    writeFileSync(join(wtDir, "feature.ts"), "export const f = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature"', { cwd: wtDir, stdio: "pipe" });

    // Make main dirty with a tracked file change
    writeFileSync(join(repoDir, "file.txt"), "modified on main\n");

    // Merge should handle the dirty main (stash/unstash)
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // The stashed changes should be restored
    const content = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(content).toContain("modified on main");
  });
});
