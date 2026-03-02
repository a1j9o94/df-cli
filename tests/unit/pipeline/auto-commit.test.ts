import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { autoCommitFile } from "../../../src/pipeline/auto-commit.js";

let repoDir: string;

function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-auto-commit-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  // Create initial commit
  writeFileSync(join(dir, "README.md"), "# Test\n");
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
  } catch {
    /* ignore */
  }
});

describe("autoCommitFile", () => {
  test("commits a new file to git", () => {
    const filePath = join(repoDir, "specs", "test-spec.md");
    mkdirSync(join(repoDir, "specs"), { recursive: true });
    writeFileSync(filePath, "# Test Spec\n");

    const result = autoCommitFile(repoDir, "specs/test-spec.md", "Auto-commit: spec test-spec created");
    expect(result.success).toBe(true);

    // Verify the file is committed
    const log = execSync("git log --oneline -1", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(log).toContain("Auto-commit: spec test-spec created");
  });

  test("includes the file in the git history", () => {
    const filePath = join(repoDir, "scenarios", "functional", "test.md");
    mkdirSync(join(repoDir, "scenarios", "functional"), { recursive: true });
    writeFileSync(filePath, "# Test Scenario\n");

    autoCommitFile(repoDir, "scenarios/functional/test.md", "Auto-commit: scenario test created");

    // Verify the file is in git
    const show = execSync("git show HEAD --name-only", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    expect(show).toContain("scenarios/functional/test.md");
  });

  test("does not affect other unstaged changes", () => {
    // Create an unstaged change
    writeFileSync(join(repoDir, "README.md"), "# Modified\n");

    // Auto-commit a new file
    const filePath = join(repoDir, "specs", "new.md");
    mkdirSync(join(repoDir, "specs"), { recursive: true });
    writeFileSync(filePath, "# New Spec\n");

    autoCommitFile(repoDir, "specs/new.md", "Auto-commit: spec new created");

    // The README.md change should still be unstaged
    const status = execSync("git status --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();
    expect(status).toContain("README.md");
  });

  test("returns failure when file does not exist", () => {
    const result = autoCommitFile(repoDir, "nonexistent.md", "Should fail");
    expect(result.success).toBe(false);
  });

  test("returns failure when not in a git repo", () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), "df-no-git-"));
    writeFileSync(join(nonGitDir, "file.md"), "content");

    const result = autoCommitFile(nonGitDir, "file.md", "Should fail");
    expect(result.success).toBe(false);

    rmSync(nonGitDir, { recursive: true, force: true });
  });
});
