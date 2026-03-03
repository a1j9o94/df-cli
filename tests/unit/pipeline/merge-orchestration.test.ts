import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  mergeSingleBranch,
  type MergeBranchResult,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a test git repo.
 */
function setupTestRepo(): { mainRepo: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-orch-"));
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
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

// =============================================================================
// mergeSingleBranch — clean merge
// =============================================================================

describe("mergeSingleBranch — clean merge", () => {
  test("returns success with status 'clean' for non-conflicting changes", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-clean");

    // Make a non-conflicting change on the feature branch
    writeFileSync(join(wtDir, "feature.txt"), "feature code\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add feature"', { cwd: wtDir, stdio: "pipe" });

    const result = mergeSingleBranch(wtDir, repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.status).toBe("clean");
    expect(result.branch).toBe("feature-clean");
    expect(result.conflictedFiles).toBeUndefined();
  });

  test("merged file appears on main after clean merge", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-visible");

    writeFileSync(join(wtDir, "visible.txt"), "I am visible\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add visible"', { cwd: wtDir, stdio: "pipe" });

    mergeSingleBranch(wtDir, repoDir, "main");

    const content = readFileSync(join(repoDir, "visible.txt"), "utf-8");
    expect(content).toContain("I am visible");
  });
});

// =============================================================================
// mergeSingleBranch — conflict detection
// =============================================================================

describe("mergeSingleBranch — conflict detection", () => {
  test("returns status 'conflicted' when merge has conflicts", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-conflict");

    // Change the same file on both branches
    writeFileSync(join(wtDir, "file.txt"), "feature change\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature changes file.txt"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes file.txt"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wtDir, repoDir, "main");
    expect(result.success).toBe(false);
    expect(result.status).toBe("conflicted");
    expect(result.branch).toBe("feature-conflict");
  });

  test("returns conflictedFiles with paths and content on conflict", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-conflict2");

    writeFileSync(join(wtDir, "file.txt"), "feature change\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature changes file.txt"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes file.txt"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wtDir, repoDir, "main");
    expect(result.conflictedFiles).toBeDefined();
    expect(result.conflictedFiles!.length).toBeGreaterThan(0);
    expect(result.conflictedFiles![0].path).toBe("file.txt");
    expect(result.conflictedFiles![0].content).toContain("<<<<<<<");
    expect(result.conflictedFiles![0].content).toContain(">>>>>>>");
  });

  test("leaves merge in progress (not committed, not aborted) on conflict", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-inprogress");

    writeFileSync(join(wtDir, "file.txt"), "feature change\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature changes file.txt"', { cwd: wtDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes file.txt"', { cwd: repoDir, stdio: "pipe" });

    mergeSingleBranch(wtDir, repoDir, "main");

    // The merge should be left in progress — git merge HEAD file should have markers
    const fileContent = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(fileContent).toContain("<<<<<<<");
  });
});

// =============================================================================
// mergeSingleBranch — sequential merge (second branch on updated main)
// =============================================================================

describe("mergeSingleBranch — sequential merge", () => {
  test("second branch merges cleanly after first branch merged", () => {
    const wt1 = createWorktreeBranch(repoDir, "build-first");
    const wt2 = createWorktreeBranch(repoDir, "build-second");

    // First branch adds a file
    writeFileSync(join(wt1, "first.txt"), "first feature\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Add first"', { cwd: wt1, stdio: "pipe" });

    // Second branch adds a different file
    writeFileSync(join(wt2, "second.txt"), "second feature\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Add second"', { cwd: wt2, stdio: "pipe" });

    // Merge first branch
    const result1 = mergeSingleBranch(wt1, repoDir, "main");
    expect(result1.success).toBe(true);
    expect(result1.status).toBe("clean");

    // Merge second branch — should also be clean since no conflicts
    const result2 = mergeSingleBranch(wt2, repoDir, "main");
    expect(result2.success).toBe(true);
    expect(result2.status).toBe("clean");

    // Main should have both files
    const files = execSync("ls", { cwd: repoDir, encoding: "utf-8" });
    expect(files).toContain("first.txt");
    expect(files).toContain("second.txt");
  });

  test("second branch conflicts with first branch's changes", () => {
    const wt1 = createWorktreeBranch(repoDir, "build-ok");
    const wt2 = createWorktreeBranch(repoDir, "build-clashes");

    // Both change the same file
    writeFileSync(join(wt1, "file.txt"), "build-ok changes\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Build OK"', { cwd: wt1, stdio: "pipe" });

    writeFileSync(join(wt2, "file.txt"), "build-clashes changes\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Build Clashes"', { cwd: wt2, stdio: "pipe" });

    // First merge succeeds
    const result1 = mergeSingleBranch(wt1, repoDir, "main");
    expect(result1.success).toBe(true);

    // Second merge detects conflict
    const result2 = mergeSingleBranch(wt2, repoDir, "main");
    expect(result2.success).toBe(false);
    expect(result2.status).toBe("conflicted");
    expect(result2.conflictedFiles).toBeDefined();
    expect(result2.conflictedFiles!.length).toBe(1);
    expect(result2.conflictedFiles![0].path).toBe("file.txt");
  });
});

// =============================================================================
// MergeBranchResult contract
// =============================================================================

describe("MergeBranchResult contract", () => {
  test("clean result has expected shape", () => {
    const wt = createWorktreeBranch(repoDir, "shape-test");
    writeFileSync(join(wt, "shape.txt"), "shape\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Shape test"', { cwd: wt, stdio: "pipe" });

    const result: MergeBranchResult = mergeSingleBranch(wt, repoDir, "main");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("branch");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.status).toBe("string");
    expect(typeof result.branch).toBe("string");
  });

  test("conflicted result includes conflictedFiles array", () => {
    const wt = createWorktreeBranch(repoDir, "conflict-shape");

    writeFileSync(join(wt, "file.txt"), "conflict side\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Conflict shape"', { cwd: wt, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main side\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main side"', { cwd: repoDir, stdio: "pipe" });

    const result: MergeBranchResult = mergeSingleBranch(wt, repoDir, "main");
    expect(result.conflictedFiles).toBeDefined();
    expect(Array.isArray(result.conflictedFiles)).toBe(true);
    expect(result.conflictedFiles![0]).toHaveProperty("path");
    expect(result.conflictedFiles![0]).toHaveProperty("content");
  });
});
