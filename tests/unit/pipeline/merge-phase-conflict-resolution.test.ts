import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
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
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-conflict-res-"));
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
// Conflict detection → agent handoff flow
// =============================================================================

describe("merge-phase conflict resolution flow", () => {
  test("mergeSingleBranch can be aborted after conflict to allow agent resolution", () => {
    const wt = createWorktreeBranch(repoDir, "feature-abort-test");

    // Create conflict
    writeFileSync(join(wt, "file.txt"), "feature side\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Feature change"', { cwd: wt, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main side\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wt, repoDir, "main");
    expect(result.status).toBe("conflicted");

    // The caller can abort the merge
    execSync("git merge --abort", { cwd: repoDir, stdio: "pipe" });

    // After abort, repo is clean — no conflict markers
    const content = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(content).toBe("main side\n");
  });

  test("after conflict, agent can resolve and commit the merge", () => {
    const wt = createWorktreeBranch(repoDir, "feature-resolve-test");

    // Create conflict
    writeFileSync(join(wt, "file.txt"), "feature code\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Feature change"', { cwd: wt, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main code\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wt, repoDir, "main");
    expect(result.status).toBe("conflicted");
    expect(result.conflictedFiles).toBeDefined();

    // Simulate agent resolving the conflict: combine both sides
    writeFileSync(join(repoDir, "file.txt"), "main code\nfeature code\n");
    execSync("git add file.txt", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Merge resolution"', { cwd: repoDir, stdio: "pipe" });

    // Verify: no conflict markers, both changes present
    const finalContent = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(finalContent).toContain("main code");
    expect(finalContent).toContain("feature code");
    expect(finalContent).not.toContain("<<<<<<<");
  });

  test("conflictedFiles include correct paths for multiple conflicting files", () => {
    const wt = createWorktreeBranch(repoDir, "feature-multi-conflict");

    // Create two files that will both conflict
    writeFileSync(join(repoDir, "a.txt"), "base a\n");
    writeFileSync(join(repoDir, "b.txt"), "base b\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Add base files"', { cwd: repoDir, stdio: "pipe" });

    // Sync the worktree to have the base files
    execSync("git merge main", { cwd: wt, stdio: "pipe" });

    // Feature branch changes both
    writeFileSync(join(wt, "a.txt"), "feature a\n");
    writeFileSync(join(wt, "b.txt"), "feature b\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Feature changes both"', { cwd: wt, stdio: "pipe" });

    // Main changes both differently
    writeFileSync(join(repoDir, "a.txt"), "main a\n");
    writeFileSync(join(repoDir, "b.txt"), "main b\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main changes both"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wt, repoDir, "main");
    expect(result.status).toBe("conflicted");
    expect(result.conflictedFiles!.length).toBe(2);

    const paths = result.conflictedFiles!.map(f => f.path).sort();
    expect(paths).toEqual(["a.txt", "b.txt"]);

    // Each file should have conflict markers
    for (const file of result.conflictedFiles!) {
      expect(file.content).toContain("<<<<<<<");
      expect(file.content).toContain(">>>>>>>");
    }

    // Clean up the merge
    execSync("git merge --abort", { cwd: repoDir, stdio: "pipe" });
  });
});

// =============================================================================
// Three modules cascading: A clean, B conflicts with A, agent resolves, C clean
// =============================================================================

describe("three modules cascading merge", () => {
  test("Module A merges clean, B conflicts with A, C merges against resolved state", () => {
    // Module A adds a new function to shared file
    const wtA = createWorktreeBranch(repoDir, "module-a");
    writeFileSync(join(wtA, "shared.ts"), "// shared module\nexport function fromA() { return 'A'; }\n");
    execSync("git add -A", { cwd: wtA, stdio: "pipe" });
    execSync('git commit -m "Module A: add fromA"', { cwd: wtA, stdio: "pipe" });

    // Module B also modifies the same initial file in a different way
    const wtB = createWorktreeBranch(repoDir, "module-b");
    writeFileSync(join(wtB, "shared.ts"), "// shared module\nexport function fromB() { return 'B'; }\n");
    execSync("git add -A", { cwd: wtB, stdio: "pipe" });
    execSync('git commit -m "Module B: add fromB"', { cwd: wtB, stdio: "pipe" });

    // Module C adds an independent file
    const wtC = createWorktreeBranch(repoDir, "module-c");
    writeFileSync(join(wtC, "module-c.ts"), "export function fromC() { return 'C'; }\n");
    execSync("git add -A", { cwd: wtC, stdio: "pipe" });
    execSync('git commit -m "Module C: add fromC"', { cwd: wtC, stdio: "pipe" });

    // Step 1: Merge Module A — should be clean
    const resultA = mergeSingleBranch(wtA, repoDir, "main");
    expect(resultA.success).toBe(true);
    expect(resultA.status).toBe("clean");

    // Step 2: Merge Module B — should conflict with A's changes
    const resultB = mergeSingleBranch(wtB, repoDir, "main");
    expect(resultB.success).toBe(false);
    expect(resultB.status).toBe("conflicted");
    expect(resultB.conflictedFiles!.length).toBeGreaterThan(0);

    // Simulate agent resolving B's conflict: combine both functions
    writeFileSync(
      join(repoDir, "shared.ts"),
      "// shared module\nexport function fromA() { return 'A'; }\nexport function fromB() { return 'B'; }\n"
    );
    execSync("git add shared.ts", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Merge module-b: resolve conflict with module-a"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    // Step 3: Merge Module C — should be clean (independent file)
    const resultC = mergeSingleBranch(wtC, repoDir, "main");
    expect(resultC.success).toBe(true);
    expect(resultC.status).toBe("clean");

    // Verify all three modules' code is on main
    const sharedContent = readFileSync(join(repoDir, "shared.ts"), "utf-8");
    expect(sharedContent).toContain("fromA");
    expect(sharedContent).toContain("fromB");

    const cContent = readFileSync(join(repoDir, "module-c.ts"), "utf-8");
    expect(cContent).toContain("fromC");
  });
});

// =============================================================================
// No conflict markers verification
// =============================================================================

describe("no conflict markers after resolution", () => {
  test("verifyNoConflictMarkers returns true when no markers exist", () => {
    // After a clean merge, there should be no conflict markers
    const wt = createWorktreeBranch(repoDir, "no-markers");
    writeFileSync(join(wt, "clean.txt"), "clean content\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Clean"', { cwd: wt, stdio: "pipe" });

    mergeSingleBranch(wt, repoDir, "main");

    // Check no conflict markers in tracked files
    const markerFiles = execSync("git grep -l '<<<<<<<' || echo ''", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(markerFiles).toBe("");
  });

  test("conflict markers are detectable in tracked files", () => {
    const wt = createWorktreeBranch(repoDir, "markers-check");

    writeFileSync(join(wt, "file.txt"), "feature\n");
    execSync("git add -A", { cwd: wt, stdio: "pipe" });
    execSync('git commit -m "Feature"', { cwd: wt, stdio: "pipe" });

    writeFileSync(join(repoDir, "file.txt"), "main\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main"', { cwd: repoDir, stdio: "pipe" });

    const result = mergeSingleBranch(wt, repoDir, "main");
    expect(result.status).toBe("conflicted");

    // While merge is in progress, conflict markers ARE present
    const fileContent = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(fileContent).toContain("<<<<<<<");

    // Clean up
    execSync("git merge --abort", { cwd: repoDir, stdio: "pipe" });
  });
});
