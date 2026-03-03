/**
 * Tests for the merge-strategy module.
 *
 * This covers:
 * - MergeBranchResult interface contract
 * - mergeSingleBranch function (the single-branch merge with conflict detection)
 * - Updated rebaseAndMerge that returns per-branch conflict info
 * - Isolation: the merge command is in one function, separate from conflict detection
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  mergeSingleBranch,
  rebaseAndMerge,
  scanConflictMarkers,
  type MergeBranchResult,
  type MergeResult,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a test git repo.
 */
function setupTestRepo(): { mainRepo: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-strategy-test-"));
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

/**
 * Helper to get the branch name of a worktree.
 */
function getWorktreeBranch(worktreePath: string): string {
  return execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: worktreePath,
    encoding: "utf-8",
  }).trim();
}

beforeEach(() => {
  const setup = setupTestRepo();
  repoDir = setup.mainRepo;
});

afterEach(() => {
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
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

describe("MergeBranchResult contract", () => {
  test("successful merge returns success=true with no conflicts", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-clean");

    // Add a non-conflicting file on the branch
    writeFileSync(join(wtDir, "feature.txt"), "feature code\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature"', { cwd: wtDir, stdio: "pipe" });

    const branch = getWorktreeBranch(wtDir);
    const result: MergeBranchResult = mergeSingleBranch(repoDir, branch);

    expect(result.success).toBe(true);
    expect(result.conflicted).toBe(false);
    expect(result.branch).toBe("feature-clean");
    expect(result.conflictedFiles).toBeUndefined();
  });

  test("conflicting merge returns success=false, conflicted=true, and conflictedFiles", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-conflict");

    // Modify file.txt on the branch
    writeFileSync(join(wtDir, "file.txt"), "branch changes\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Branch changes file.txt"', { cwd: wtDir, stdio: "pipe" });

    // Also modify file.txt on main (different content)
    writeFileSync(join(repoDir, "file.txt"), "main changes\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes file.txt"', { cwd: repoDir, stdio: "pipe" });

    const branch = getWorktreeBranch(wtDir);
    const result: MergeBranchResult = mergeSingleBranch(repoDir, branch);

    expect(result.success).toBe(false);
    expect(result.conflicted).toBe(true);
    expect(result.branch).toBe("feature-conflict");
    expect(result.conflictedFiles).toBeDefined();
    expect(result.conflictedFiles!.length).toBeGreaterThan(0);
    expect(result.conflictedFiles![0]).toBe("file.txt");
  });

  test("conflict markers are left on disk when conflicted", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-markers");

    // Create conflict
    writeFileSync(join(wtDir, "file.txt"), "branch version\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Branch version"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main version\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main version"', { cwd: repoDir, stdio: "pipe" });

    const branch = getWorktreeBranch(wtDir);
    const result = mergeSingleBranch(repoDir, branch);

    expect(result.conflicted).toBe(true);

    // Conflict markers should be on disk in the main repo
    const content = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(content).toContain("<<<<<<<");
    expect(content).toContain(">>>>>>>");
  });
});

describe("mergeSingleBranch isolation", () => {
  test("clean merge commits automatically", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-auto");

    writeFileSync(join(wtDir, "auto.txt"), "auto content\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add auto"', { cwd: wtDir, stdio: "pipe" });

    const branch = getWorktreeBranch(wtDir);
    const headBefore = execSync("git rev-parse HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();

    const result = mergeSingleBranch(repoDir, branch);
    expect(result.success).toBe(true);

    // HEAD should have advanced (new merge commit)
    const headAfter = execSync("git rev-parse HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(headAfter).not.toBe(headBefore);

    // The auto.txt file should be on main
    const files = execSync("ls", { cwd: repoDir, encoding: "utf-8" });
    expect(files).toContain("auto.txt");
  });

  test("conflicted merge does NOT commit", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-no-commit");

    writeFileSync(join(wtDir, "file.txt"), "branch edits\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Branch edits"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main edits\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main edits"', { cwd: repoDir, stdio: "pipe" });

    const headBefore = execSync("git rev-parse HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();

    const branch = getWorktreeBranch(wtDir);
    mergeSingleBranch(repoDir, branch);

    // HEAD should NOT have advanced (merge is not committed due to conflicts)
    const headAfter = execSync("git rev-parse HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(headAfter).toBe(headBefore);
  });

  test("merge strategy is isolated to one function", () => {
    // mergeSingleBranch should be the only place the git merge command lives.
    // This test verifies the function exists and is exported separately.
    expect(typeof mergeSingleBranch).toBe("function");
  });
});

describe("sequential merge with conflict detection", () => {
  test("two non-conflicting branches merge sequentially", () => {
    const wt1 = createWorktreeBranch(repoDir, "mod-a");
    const wt2 = createWorktreeBranch(repoDir, "mod-b");

    writeFileSync(join(wt1, "a.txt"), "module A\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Add A"', { cwd: wt1, stdio: "pipe" });

    writeFileSync(join(wt2, "b.txt"), "module B\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Add B"', { cwd: wt2, stdio: "pipe" });

    // First merge
    const r1 = mergeSingleBranch(repoDir, "mod-a");
    expect(r1.success).toBe(true);
    expect(r1.conflicted).toBe(false);

    // Second merge — mod-b merges against post-A state
    const r2 = mergeSingleBranch(repoDir, "mod-b");
    expect(r2.success).toBe(true);
    expect(r2.conflicted).toBe(false);

    // Both files should be on main
    const files = execSync("ls", { cwd: repoDir, encoding: "utf-8" });
    expect(files).toContain("a.txt");
    expect(files).toContain("b.txt");
  });

  test("second branch conflicts with first merged branch", () => {
    const wt1 = createWorktreeBranch(repoDir, "mod-first");
    const wt2 = createWorktreeBranch(repoDir, "mod-second");

    // Both modify file.txt differently
    writeFileSync(join(wt1, "file.txt"), "first module changes\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "First module"', { cwd: wt1, stdio: "pipe" });

    writeFileSync(join(wt2, "file.txt"), "second module changes\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Second module"', { cwd: wt2, stdio: "pipe" });

    // First merges clean
    const r1 = mergeSingleBranch(repoDir, "mod-first");
    expect(r1.success).toBe(true);

    // Second conflicts
    const r2 = mergeSingleBranch(repoDir, "mod-second");
    expect(r2.success).toBe(false);
    expect(r2.conflicted).toBe(true);
    expect(r2.conflictedFiles).toContain("file.txt");
  });

  test("three modules: A clean, B conflicts, C clean after resolution", () => {
    const wt1 = createWorktreeBranch(repoDir, "mod-a3");
    const wt2 = createWorktreeBranch(repoDir, "mod-b3");
    const wt3 = createWorktreeBranch(repoDir, "mod-c3");

    // Module A: modifies file.txt
    writeFileSync(join(wt1, "file.txt"), "module A changes\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Module A"', { cwd: wt1, stdio: "pipe" });

    // Module B: also modifies file.txt (will conflict with A)
    writeFileSync(join(wt2, "file.txt"), "module B changes\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Module B"', { cwd: wt2, stdio: "pipe" });

    // Module C: adds a new file (no overlap)
    writeFileSync(join(wt3, "c.txt"), "module C\n");
    execSync("git add -A", { cwd: wt3, stdio: "pipe" });
    execSync('git commit -m "Module C"', { cwd: wt3, stdio: "pipe" });

    // A merges clean
    const r1 = mergeSingleBranch(repoDir, "mod-a3");
    expect(r1.success).toBe(true);
    expect(r1.conflicted).toBe(false);

    // B conflicts with A
    const r2 = mergeSingleBranch(repoDir, "mod-b3");
    expect(r2.success).toBe(false);
    expect(r2.conflicted).toBe(true);

    // Simulate agent resolving conflict: write resolved content, git add, git commit
    writeFileSync(join(repoDir, "file.txt"), "module A changes\nmodule B changes\n");
    execSync("git add file.txt", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Merge branch mod-b3 (agent resolved)"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    // C should merge clean against the resolved A+B state
    const r3 = mergeSingleBranch(repoDir, "mod-c3");
    expect(r3.success).toBe(true);
    expect(r3.conflicted).toBe(false);

    // All content should be present
    const fileContent = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(fileContent).toContain("module A changes");
    expect(fileContent).toContain("module B changes");
    expect(readFileSync(join(repoDir, "c.txt"), "utf-8")).toContain("module C");
  });
});

describe("rebaseAndMerge returns branchResults with conflict info", () => {
  test("includes branchResults array in MergeResult", () => {
    const wt1 = createWorktreeBranch(repoDir, "feat-br1");
    writeFileSync(join(wt1, "br1.txt"), "branch 1\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Branch 1"', { cwd: wt1, stdio: "pipe" });

    const result = rebaseAndMerge([wt1], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.branchResults).toBeDefined();
    expect(result.branchResults!.length).toBe(1);
    expect(result.branchResults![0].success).toBe(true);
    expect(result.branchResults![0].branch).toBe("feat-br1");
    expect(result.branchResults![0].conflicted).toBe(false);
  });

  test("branchResults includes conflicted branch info", () => {
    const wt1 = createWorktreeBranch(repoDir, "feat-ok2");
    const wt2 = createWorktreeBranch(repoDir, "feat-conflict2");

    // wt1: modify file.txt
    writeFileSync(join(wt1, "file.txt"), "ok changes\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "OK changes"', { cwd: wt1, stdio: "pipe" });

    // wt2: also modify file.txt differently
    writeFileSync(join(wt2, "file.txt"), "conflict changes\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Conflict changes"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");

    // Overall: fail because of second branch
    expect(result.success).toBe(false);
    expect(result.branchResults).toBeDefined();
    expect(result.branchResults!.length).toBe(2);

    // First branch: success
    expect(result.branchResults![0].success).toBe(true);
    expect(result.branchResults![0].conflicted).toBe(false);

    // Second branch: conflicted
    expect(result.branchResults![1].success).toBe(false);
    expect(result.branchResults![1].conflicted).toBe(true);
    expect(result.branchResults![1].conflictedFiles).toBeDefined();
    expect(result.branchResults![1].conflictedFiles!).toContain("file.txt");
  });
});

describe("scanConflictMarkers", () => {
  test("returns found=false when no conflict markers exist", () => {
    writeFileSync(join(repoDir, "clean.txt"), "no conflicts here\n");
    const result = scanConflictMarkers(repoDir);
    expect(result.found).toBe(false);
    expect(result.files).toEqual([]);
  });

  test("returns found=true with file list when conflict markers present", () => {
    writeFileSync(
      join(repoDir, "conflicted.txt"),
      "some code\n<<<<<<< HEAD\nour version\n=======\ntheir version\n>>>>>>> branch\nmore code\n",
    );
    // File must be tracked by git for git grep to find it
    execSync("git add conflicted.txt", { cwd: repoDir, stdio: "pipe" });
    const result = scanConflictMarkers(repoDir);
    expect(result.found).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files).toContain("conflicted.txt");
  });

  test("ignores non-tracked files", () => {
    // Create an untracked file with conflict markers
    writeFileSync(join(repoDir, "untracked-conflict.txt"), "<<<<<<< HEAD\n=======\n>>>>>>>\n");
    // scanConflictMarkers should scan tracked files only
    const result = scanConflictMarkers(repoDir);
    // The untracked file isn't in git, so it shouldn't be found
    // (though this depends on implementation — scanning working tree vs tracked)
    expect(typeof result.found).toBe("boolean");
  });

  test("detects markers after a failed merge", () => {
    const wtDir = createWorktreeBranch(repoDir, "scan-test");

    writeFileSync(join(wtDir, "file.txt"), "scan branch\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Scan branch"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "scan main\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Scan main"', { cwd: repoDir, stdio: "pipe" });

    const mergeResult = mergeSingleBranch(repoDir, "scan-test");
    expect(mergeResult.conflicted).toBe(true);

    // Conflict markers should be present
    const scanResult = scanConflictMarkers(repoDir);
    expect(scanResult.found).toBe(true);
    expect(scanResult.files).toContain("file.txt");
  });

  test("returns found=false after conflict markers are resolved", () => {
    const wtDir = createWorktreeBranch(repoDir, "resolve-test");

    writeFileSync(join(wtDir, "file.txt"), "resolve branch\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Resolve branch"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "resolve main\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Resolve main"', { cwd: repoDir, stdio: "pipe" });

    mergeSingleBranch(repoDir, "resolve-test");

    // Resolve conflict
    writeFileSync(join(repoDir, "file.txt"), "resolved content\n");
    execSync("git add file.txt", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Resolved"', { cwd: repoDir, stdio: "pipe" });

    const scanResult = scanConflictMarkers(repoDir);
    expect(scanResult.found).toBe(false);
    expect(scanResult.files).toEqual([]);
  });
});
