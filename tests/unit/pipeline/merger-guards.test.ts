import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  checkMergerGuards,
  runProjectTests,
  scanConflictMarkers,
  checkStateDbNotStaged,
} from "../../../src/pipeline/merger-guards.js";

let repoDir: string;
let dfDir: string;

/**
 * Setup a git repo with .df directory for testing merger guards.
 */
function setupTestRepo(): { repoDir: string; dfDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-merger-guard-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  const dfPath = join(dir, ".df");
  mkdirSync(dfPath, { recursive: true });

  // Write a minimal config.yaml
  writeFileSync(
    join(dfPath, "config.yaml"),
    "project:\n  name: test\n  root: .\n  branch: main\n",
  );

  return { repoDir: dir, dfDir: dfPath };
}

beforeEach(() => {
  const setup = setupTestRepo();
  repoDir = setup.repoDir;
  dfDir = setup.dfDir;
});

afterEach(() => {
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("runProjectTests", () => {
  test("returns success when test command passes", () => {
    // Create a trivial test command that exits 0
    writeFileSync(join(repoDir, "package.json"), JSON.stringify({
      scripts: { test: "echo 'all tests pass'" },
    }));

    const result = runProjectTests(repoDir);
    expect(result.passed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("returns failure when test command fails", () => {
    writeFileSync(join(repoDir, "package.json"), JSON.stringify({
      scripts: { test: "echo 'FAIL: test broken' && exit 1" },
    }));

    const result = runProjectTests(repoDir);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns success when no test command is configured", () => {
    // No package.json at all — should skip gracefully
    const result = runProjectTests(repoDir);
    expect(result.passed).toBe(true);
  });
});

describe("scanConflictMarkers", () => {
  test("returns no conflicts in clean repo", () => {
    const result = scanConflictMarkers(repoDir);
    expect(result.found).toBe(false);
    expect(result.files).toHaveLength(0);
  });

  test("detects <<<<<<< conflict markers in tracked files", () => {
    writeFileSync(
      join(repoDir, "conflict.txt"),
      "some code\n<<<<<<< HEAD\nour version\n=======\ntheir version\n>>>>>>> branch\n",
    );
    execSync("git add conflict.txt", { cwd: repoDir, stdio: "pipe" });

    const result = scanConflictMarkers(repoDir);
    expect(result.found).toBe(true);
    expect(result.files).toContain("conflict.txt");
  });

  test("does not flag conflict markers in untracked files", () => {
    writeFileSync(
      join(repoDir, "untracked.txt"),
      "<<<<<<< HEAD\nstuff\n=======\nother\n>>>>>>> branch\n",
    );

    const result = scanConflictMarkers(repoDir);
    expect(result.found).toBe(false);
  });
});

describe("checkStateDbNotStaged", () => {
  test("returns clean when no state.db files are staged", () => {
    const result = checkStateDbNotStaged(repoDir);
    expect(result.clean).toBe(true);
    expect(result.files).toHaveLength(0);
  });

  test("detects staged .df/state.db files", () => {
    mkdirSync(join(repoDir, ".df"), { recursive: true });
    writeFileSync(join(repoDir, ".df", "state.db-wal"), "bad data");
    execSync("git add -f .df/state.db-wal", { cwd: repoDir, stdio: "pipe" });

    const result = checkStateDbNotStaged(repoDir);
    expect(result.clean).toBe(false);
    expect(result.files).toContain(".df/state.db-wal");
  });

  test("detects modified .df/state.db files", () => {
    // First commit a state.db file (simulating broken state)
    mkdirSync(join(repoDir, ".df"), { recursive: true });
    writeFileSync(join(repoDir, ".df", "state.db-shm"), "original");
    execSync("git add -f .df/state.db-shm", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "add state db"', { cwd: repoDir, stdio: "pipe" });

    // Now modify it
    writeFileSync(join(repoDir, ".df", "state.db-shm"), "modified");

    const result = checkStateDbNotStaged(repoDir);
    expect(result.clean).toBe(false);
    expect(result.files).toContain(".df/state.db-shm");
  });
});

describe("checkMergerGuards", () => {
  test("passes all guards on a clean repo", () => {
    const result = checkMergerGuards(repoDir, dfDir);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("fails when conflict markers are present", () => {
    writeFileSync(
      join(repoDir, "conflict.txt"),
      "<<<<<<< HEAD\nour\n=======\ntheir\n>>>>>>> branch\n",
    );
    execSync("git add conflict.txt", { cwd: repoDir, stdio: "pipe" });

    const result = checkMergerGuards(repoDir, dfDir);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes("conflict marker"))).toBe(true);
  });

  test("fails when state.db files are staged", () => {
    mkdirSync(join(repoDir, ".df"), { recursive: true });
    writeFileSync(join(repoDir, ".df", "state.db-wal"), "stale wal");
    execSync("git add -f .df/state.db-wal", { cwd: repoDir, stdio: "pipe" });

    const result = checkMergerGuards(repoDir, dfDir);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes("state.db"))).toBe(true);
  });

  test("collects multiple errors", () => {
    // Conflict markers AND state.db staged
    writeFileSync(
      join(repoDir, "conflict.txt"),
      "<<<<<<< HEAD\nour\n=======\ntheir\n>>>>>>> branch\n",
    );
    execSync("git add conflict.txt", { cwd: repoDir, stdio: "pipe" });

    mkdirSync(join(repoDir, ".df"), { recursive: true });
    writeFileSync(join(repoDir, ".df", "state.db-shm"), "stale shm");
    execSync("git add -f .df/state.db-shm", { cwd: repoDir, stdio: "pipe" });

    const result = checkMergerGuards(repoDir, dfDir);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
