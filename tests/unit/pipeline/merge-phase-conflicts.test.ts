/**
 * Tests for merge-phase conflict handling: when a branch has conflicts,
 * the merge phase should spawn the merger agent to resolve instead of failing.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  mergeSingleBranch,
  rebaseAndMerge,
  scanConflictMarkers,
  type MergeBranchResult,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

function setupTestRepo(): { mainRepo: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-conflict-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return { mainRepo: dir };
}

function createWorktreeBranch(mainRepo: string, branchName: string): string {
  const wtDir = mkdtempSync(join(tmpdir(), `df-wt-${branchName}-`));
  rmSync(wtDir, { recursive: true, force: true });
  execSync(`git worktree add -b ${branchName} "${wtDir}" HEAD`, {
    cwd: mainRepo,
    stdio: "pipe",
  });
  execSync("git config user.email test@test.com", {
    cwd: wtDir,
    stdio: "pipe",
  });
  execSync("git config user.name Test", { cwd: wtDir, stdio: "pipe" });
  return wtDir;
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
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("merge-phase conflict flow", () => {
  test("conflicted branch returns branchResults with conflict info for agent handoff", () => {
    const wt1 = createWorktreeBranch(repoDir, "mod-ok");
    const wt2 = createWorktreeBranch(repoDir, "mod-conflict");

    // wt1: modify file.txt
    writeFileSync(join(wt1, "file.txt"), "module ok version\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Module OK"', { cwd: wt1, stdio: "pipe" });

    // wt2: also modify file.txt
    writeFileSync(join(wt2, "file.txt"), "module conflict version\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Module Conflict"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");

    // Overall fail, but branchResults tells us exactly what happened
    expect(result.success).toBe(false);
    expect(result.branchResults).toBeDefined();

    // Find the conflicted branch result
    const conflictedResult = result.branchResults!.find((r) => r.conflicted);
    expect(conflictedResult).toBeDefined();
    expect(conflictedResult!.branch).toBe("mod-conflict");
    expect(conflictedResult!.conflictedFiles).toBeDefined();
    expect(conflictedResult!.conflictedFiles!).toContain("file.txt");

    // The merge phase can use this info to hand off to the agent
    // Verify conflict markers are on disk
    const content = readFileSync(join(repoDir, "file.txt"), "utf-8");
    expect(content).toContain("<<<<<<<");
  });

  test("after agent resolves, scanConflictMarkers returns found=false", () => {
    const wt1 = createWorktreeBranch(repoDir, "mod-resolve-ok");
    const wt2 = createWorktreeBranch(repoDir, "mod-resolve-conflict");

    writeFileSync(join(wt1, "file.txt"), "ok version\n");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "OK version"', { cwd: wt1, stdio: "pipe" });

    writeFileSync(join(wt2, "file.txt"), "conflict version\n");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Conflict version"', { cwd: wt2, stdio: "pipe" });

    // First branch merges clean
    const r1 = mergeSingleBranch(repoDir, "mod-resolve-ok");
    expect(r1.success).toBe(true);

    // Second branch conflicts
    const r2 = mergeSingleBranch(repoDir, "mod-resolve-conflict");
    expect(r2.conflicted).toBe(true);

    // Simulate agent resolution
    writeFileSync(join(repoDir, "file.txt"), "ok version\nconflict version\n");
    execSync("git add file.txt", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Agent resolved merge"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    // Verify no markers remain
    const scan = scanConflictMarkers(repoDir);
    expect(scan.found).toBe(false);
    expect(scan.files).toEqual([]);
  });

  test("three-module cascading merge: A clean, B conflict+resolve, C clean", () => {
    // Setup per the scenario:
    // server.ts, routes.ts, utils.ts
    writeFileSync(
      join(repoDir, "server.ts"),
      'export function startServer() { return listen(3000); }\n',
    );
    writeFileSync(
      join(repoDir, "routes.ts"),
      "export function getRoutes() { return ['/api/health']; }\n",
    );
    writeFileSync(
      join(repoDir, "utils.ts"),
      "export function formatDate(d: Date) { return d.toISOString(); }\n",
    );
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Initial multi-file setup"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    const wt1 = createWorktreeBranch(repoDir, "builder-mod-a");
    const wt2 = createWorktreeBranch(repoDir, "builder-mod-b");
    const wt3 = createWorktreeBranch(repoDir, "builder-mod-c");

    // Module A: change port in server.ts
    writeFileSync(
      join(wt1, "server.ts"),
      'export function startServer() { return listen(8080); }\n',
    );
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Module A: change port to 8080"', {
      cwd: wt1,
      stdio: "pipe",
    });

    // Module B: change port in server.ts (conflicts with A) AND add route
    writeFileSync(
      join(wt2, "server.ts"),
      'export function startServer() { return listen(9090); }\n',
    );
    writeFileSync(
      join(wt2, "routes.ts"),
      "export function getRoutes() { return ['/api/health', '/api/users']; }\n",
    );
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Module B: change port to 9090 + add route"', {
      cwd: wt2,
      stdio: "pipe",
    });

    // Module C: change utils.ts only (no overlap)
    writeFileSync(
      join(wt3, "utils.ts"),
      "export function formatDate(d: Date) { return d.toLocaleDateString(); }\n",
    );
    execSync("git add -A", { cwd: wt3, stdio: "pipe" });
    execSync('git commit -m "Module C: change formatDate"', {
      cwd: wt3,
      stdio: "pipe",
    });

    // Merge A — should be clean
    const r1 = mergeSingleBranch(repoDir, "builder-mod-a");
    expect(r1.success).toBe(true);
    expect(r1.conflicted).toBe(false);

    // Merge B — should conflict on server.ts
    const r2 = mergeSingleBranch(repoDir, "builder-mod-b");
    expect(r2.success).toBe(false);
    expect(r2.conflicted).toBe(true);
    expect(r2.conflictedFiles).toContain("server.ts");

    // Verify conflict markers exist
    expect(scanConflictMarkers(repoDir).found).toBe(true);

    // Agent resolves: combine both ports
    writeFileSync(
      join(repoDir, "server.ts"),
      'export function startServer() { return listen(8080); } // Combined: A=8080, B=9090\n',
    );
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Agent resolved: combined server.ts"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    // Verify no markers remain after resolution
    expect(scanConflictMarkers(repoDir).found).toBe(false);

    // Merge C — should be clean (only touches utils.ts)
    const r3 = mergeSingleBranch(repoDir, "builder-mod-c");
    expect(r3.success).toBe(true);
    expect(r3.conflicted).toBe(false);

    // Verify all files have correct content
    const serverContent = readFileSync(join(repoDir, "server.ts"), "utf-8");
    expect(serverContent).toContain("8080");

    const routesContent = readFileSync(join(repoDir, "routes.ts"), "utf-8");
    expect(routesContent).toContain("/api/users");

    const utilsContent = readFileSync(join(repoDir, "utils.ts"), "utf-8");
    expect(utilsContent).toContain("toLocaleDateString");

    // Final check: no conflict markers anywhere
    expect(scanConflictMarkers(repoDir).found).toBe(false);
  });
});
