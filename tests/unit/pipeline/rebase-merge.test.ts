import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  rebaseWorktreeBranch,
  rebaseAndMerge,
  type RebaseResult,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a bare test git repo and a working copy.
 */
function setupTestRepo(): { mainRepo: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-rebase-test-"));
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
  rmSync(wtDir, { recursive: true, force: true }); // worktree add needs dir not to exist
  execSync(`git worktree add -b ${branchName} "${wtDir}" HEAD`, {
    cwd: mainRepo,
    stdio: "pipe",
  });
  execSync("git config user.email test@test.com", { cwd: wtDir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: wtDir, stdio: "pipe" });
  return wtDir;
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
  } catch {
    // ignore
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("rebaseWorktreeBranch", () => {
  test("rebases worktree branch onto current HEAD of target", () => {
    // Create a worktree branch
    const wtDir = createWorktreeBranch(repoDir, "feature-a");

    // Make a change on the worktree branch
    writeFileSync(join(wtDir, "feature-a.txt"), "feature A code\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature A"', { cwd: wtDir, stdio: "pipe" });

    // Advance main with a different change
    writeFileSync(join(repoDir, "main-change.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repoDir, stdio: "pipe" });

    // Rebase
    const result = rebaseWorktreeBranch(wtDir, "main");
    expect(result.success).toBe(true);
    expect(result.conflicted).toBe(false);

    // Verify the worktree branch is now based on the latest main
    const mainHead = execSync("git rev-parse main", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();

    // The parent of the worktree's HEAD should be main's HEAD
    const parentCommit = execSync("git rev-parse HEAD~1", {
      cwd: wtDir,
      encoding: "utf-8",
    }).trim();

    expect(parentCommit).toBe(mainHead);
  });

  test("no-op when worktree is already up-to-date with target", () => {
    // Create a worktree branch and make a change (no advance on main)
    const wtDir = createWorktreeBranch(repoDir, "feature-b");
    writeFileSync(join(wtDir, "feature-b.txt"), "feature B code\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature B"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseWorktreeBranch(wtDir, "main");
    expect(result.success).toBe(true);
    expect(result.conflicted).toBe(false);
  });

  test("detects conflicts and aborts rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-conflict");

    // Both change the same line in the same file
    writeFileSync(join(wtDir, "file.txt"), "feature change\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature changes file.txt"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes file.txt"', { cwd: repoDir, stdio: "pipe" });

    const result = rebaseWorktreeBranch(wtDir, "main");
    expect(result.success).toBe(false);
    expect(result.conflicted).toBe(true);
  });
});

describe("rebaseAndMerge", () => {
  test("rebases then merges a single branch", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-single");

    writeFileSync(join(wtDir, "feature.txt"), "feature code\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature"', { cwd: wtDir, stdio: "pipe" });

    // Advance main
    writeFileSync(join(repoDir, "other.txt"), "other change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Other change"', { cwd: repoDir, stdio: "pipe" });

    const result = rebaseAndMerge(
      [wtDir],
      repoDir,
      "main",
    );

    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);
    expect(result.failedBranches.length).toBe(0);

    // Verify main has both changes
    const files = execSync("ls", { cwd: repoDir, encoding: "utf-8" });
    expect(files).toContain("feature.txt");
    expect(files).toContain("other.txt");
  });

  test("rebases and merges multiple branches sequentially", () => {
    // Create two worktree branches from the same base
    const wt1 = createWorktreeBranch(repoDir, "feature-1");
    const wt2 = createWorktreeBranch(repoDir, "feature-2");

    // Each branch makes a non-conflicting change
    writeFileSync(join(wt1, "feature1.txt"), "feature 1\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Add feature 1"', { cwd: wt1, stdio: "pipe" });

    writeFileSync(join(wt2, "feature2.txt"), "feature 2\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Add feature 2"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge(
      [wt1, wt2],
      repoDir,
      "main",
    );

    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // Verify main has both features
    const files = execSync("ls", { cwd: repoDir, encoding: "utf-8" });
    expect(files).toContain("feature1.txt");
    expect(files).toContain("feature2.txt");
  });

  test("second branch rebases onto first merged branch", () => {
    // This is the critical scenario from the spec:
    // Build A and Build B both started from the same main HEAD.
    // A merges first, changing engine.ts.
    // B needs to rebase onto post-A main before merging.

    const wt1 = createWorktreeBranch(repoDir, "build-a");
    const wt2 = createWorktreeBranch(repoDir, "build-b");

    // Build A modifies file.txt
    writeFileSync(join(wt1, "file.txt"), "initial content\nbuild A addition\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Build A changes"', { cwd: wt1, stdio: "pipe" });

    // Build B adds a new file (non-conflicting)
    writeFileSync(join(wt2, "new-feature.txt"), "build B feature\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Build B changes"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge(
      [wt1, wt2],
      repoDir,
      "main",
    );

    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // Verify main has both changes
    const fileContent = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(fileContent).toContain("build A addition");
    expect(readFileSync(join(repoDir, "new-feature.txt"), "utf-8")).toContain("build B feature");
  });

  test("reports conflict when branch cannot be rebased", () => {
    const wt1 = createWorktreeBranch(repoDir, "build-ok");
    const wt2 = createWorktreeBranch(repoDir, "build-conflict");

    // Build OK changes file.txt
    writeFileSync(join(wt1, "file.txt"), "build-ok changes\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Build OK"', { cwd: wt1, stdio: "pipe" });

    // Build Conflict also changes file.txt (will conflict after merge of build-ok)
    writeFileSync(join(wt2, "file.txt"), "build-conflict changes\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Build Conflict"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge(
      [wt1, wt2],
      repoDir,
      "main",
    );

    // First branch succeeds, second conflicts
    expect(result.mergedBranches.length).toBe(1);
    expect(result.failedBranches.length).toBe(1);
    expect(result.failedBranches[0]).toContain("build-conflict");
    expect(result.success).toBe(false);
  });
});
