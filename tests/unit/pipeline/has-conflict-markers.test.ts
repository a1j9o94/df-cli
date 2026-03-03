import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { hasConflictMarkers } from "../../../src/pipeline/merge-phase.js";

let repoDir: string;

function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-markers-test-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

beforeEach(() => {
  repoDir = setupTestRepo();
});

afterEach(() => {
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

describe("hasConflictMarkers", () => {
  test("returns false when no conflict markers exist", () => {
    expect(hasConflictMarkers(repoDir)).toBe(false);
  });

  test("returns true when a tracked file contains conflict markers", () => {
    // Add a file with conflict markers and commit it
    writeFileSync(
      join(repoDir, "conflicted.ts"),
      "<<<<<<< HEAD\nfunction a() {}\n=======\nfunction b() {}\n>>>>>>> branch\n"
    );
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    // Don't commit — check tracked (staged) files

    // Commit so it's fully tracked
    execSync('git commit -m "Add file with markers"', { cwd: repoDir, stdio: "pipe" });

    expect(hasConflictMarkers(repoDir)).toBe(true);
  });

  test("returns false after markers are removed and committed", () => {
    // Add markers, commit, then fix
    writeFileSync(
      join(repoDir, "was-conflicted.ts"),
      "<<<<<<< HEAD\nfunction a() {}\n=======\nfunction b() {}\n>>>>>>> branch\n"
    );
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Add markers"', { cwd: repoDir, stdio: "pipe" });

    // Fix it
    writeFileSync(join(repoDir, "was-conflicted.ts"), "function a() {}\nfunction b() {}\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Fix markers"', { cwd: repoDir, stdio: "pipe" });

    expect(hasConflictMarkers(repoDir)).toBe(false);
  });
});
