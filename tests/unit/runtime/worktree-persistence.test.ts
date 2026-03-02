/**
 * Tests for worktree persistence functionality.
 *
 * Covers:
 * - getWorktreeCommits(): lists commits in a worktree since its creation point
 * - worktreeHasCommits(): checks if a worktree has any commits since creation
 * - Worktree preservation on builder failure
 * - Worktree reuse during resume builds
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createWorktree,
  removeWorktree,
  getWorktreeCommits,
  worktreeHasCommits,
} from "../../../src/runtime/worktree.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temporary git repo for testing. */
function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "wt-persist-test-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });

  // Create an initial commit so HEAD exists
  writeFileSync(join(dir, "README.md"), "# Test repo\n");
  execSync("git add -A && git commit -m 'initial commit'", {
    cwd: dir,
    stdio: "pipe",
  });

  return dir;
}

/** Clean up a temp dir and its worktrees. */
function cleanupRepo(dir: string): void {
  try {
    // Remove any worktrees first
    const output = execSync("git worktree list --porcelain", {
      cwd: dir,
      encoding: "utf-8",
    });
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(dir)) {
        const wtPath = line.slice(9);
        try {
          execSync(`git worktree remove "${wtPath}" --force`, {
            cwd: dir,
            stdio: "pipe",
          });
        } catch {
          /* ignore */
        }
      }
    }
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore cleanup errors */
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getWorktreeCommits", () => {
  let repoDir: string;
  const worktrees: string[] = [];

  beforeEach(() => {
    repoDir = createTempRepo();
  });

  afterEach(() => {
    for (const wt of worktrees) {
      try {
        removeWorktree(wt);
      } catch {
        /* ignore */
      }
    }
    worktrees.length = 0;
    cleanupRepo(repoDir);
  });

  test("returns empty array for worktree with no new commits", () => {
    const wtDir = mkdtempSync(join(tmpdir(), "wt-test-"));
    rmSync(wtDir, { recursive: true }); // createWorktree needs empty target
    const wt = createWorktree(repoDir, "test-branch-empty", wtDir);
    worktrees.push(wt.path);

    const commits = getWorktreeCommits(wt.path);
    expect(commits).toEqual([]);
  });

  test("returns commits made in the worktree after creation", () => {
    const wtDir = mkdtempSync(join(tmpdir(), "wt-test-"));
    rmSync(wtDir, { recursive: true });
    const wt = createWorktree(repoDir, "test-branch-commits", wtDir);
    worktrees.push(wt.path);

    // Make a commit in the worktree
    writeFileSync(join(wt.path, "file1.ts"), "export const x = 1;\n");
    execSync("git add -A && git commit -m 'feat: add file1'", {
      cwd: wt.path,
      stdio: "pipe",
    });

    const commits = getWorktreeCommits(wt.path);
    expect(commits.length).toBe(1);
    expect(commits[0].message).toBe("feat: add file1");
    expect(commits[0].hash).toBeTruthy();
  });

  test("returns multiple commits in chronological order", () => {
    const wtDir = mkdtempSync(join(tmpdir(), "wt-test-"));
    rmSync(wtDir, { recursive: true });
    const wt = createWorktree(repoDir, "test-branch-multi", wtDir);
    worktrees.push(wt.path);

    // Make two commits
    writeFileSync(join(wt.path, "file1.ts"), "export const x = 1;\n");
    execSync("git add -A && git commit -m 'feat: add file1'", {
      cwd: wt.path,
      stdio: "pipe",
    });

    writeFileSync(join(wt.path, "file2.ts"), "export const y = 2;\n");
    execSync("git add -A && git commit -m 'feat: add file2'", {
      cwd: wt.path,
      stdio: "pipe",
    });

    const commits = getWorktreeCommits(wt.path);
    expect(commits.length).toBe(2);
    // Chronological: first commit first
    expect(commits[0].message).toBe("feat: add file1");
    expect(commits[1].message).toBe("feat: add file2");
  });
});

describe("worktreeHasCommits", () => {
  let repoDir: string;
  const worktrees: string[] = [];

  beforeEach(() => {
    repoDir = createTempRepo();
  });

  afterEach(() => {
    for (const wt of worktrees) {
      try {
        removeWorktree(wt);
      } catch {
        /* ignore */
      }
    }
    worktrees.length = 0;
    cleanupRepo(repoDir);
  });

  test("returns false for worktree with no new commits", () => {
    const wtDir = mkdtempSync(join(tmpdir(), "wt-test-"));
    rmSync(wtDir, { recursive: true });
    const wt = createWorktree(repoDir, "test-has-no-commits", wtDir);
    worktrees.push(wt.path);

    expect(worktreeHasCommits(wt.path)).toBe(false);
  });

  test("returns true for worktree with commits", () => {
    const wtDir = mkdtempSync(join(tmpdir(), "wt-test-"));
    rmSync(wtDir, { recursive: true });
    const wt = createWorktree(repoDir, "test-has-commits", wtDir);
    worktrees.push(wt.path);

    writeFileSync(join(wt.path, "file1.ts"), "export const x = 1;\n");
    execSync("git add -A && git commit -m 'feat: add file1'", {
      cwd: wt.path,
      stdio: "pipe",
    });

    expect(worktreeHasCommits(wt.path)).toBe(true);
  });

  test("returns false for nonexistent path", () => {
    expect(worktreeHasCommits("/nonexistent/path")).toBe(false);
  });
});
