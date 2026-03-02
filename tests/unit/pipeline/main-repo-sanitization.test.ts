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
  sanitizeMainRepo,
  unstashMainRepo,
} from "../../../src/pipeline/worktree-sanitization.js";

let repoDir: string;

/**
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-main-sanitize-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

/**
 * Check if git working tree is clean.
 */
function isClean(dir: string): boolean {
  const status = execSync("git status --porcelain", {
    cwd: dir,
    encoding: "utf-8",
  }).trim();
  return status === "";
}

beforeEach(() => {
  repoDir = setupTestRepo();
});

afterEach(() => {
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("sanitizeMainRepo", () => {
  test("stashes uncommitted changes", () => {
    // Make main dirty with a .claude/CLAUDE.md change
    mkdirSync(join(repoDir, ".claude"), { recursive: true });
    writeFileSync(join(repoDir, ".claude", "CLAUDE.md"), "modified by session\n");

    expect(isClean(repoDir)).toBe(false);

    const result = sanitizeMainRepo(repoDir);
    expect(result.success).toBe(true);
    expect(result.stashed).toBe(true);

    // Main should be clean after stash
    expect(isClean(repoDir)).toBe(true);

    // Stash should have our changes
    const stashList = execSync("git stash list", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    expect(stashList).toContain("df: pre-merge stash");
  });

  test("no-op when main is clean", () => {
    expect(isClean(repoDir)).toBe(true);

    const result = sanitizeMainRepo(repoDir);
    expect(result.success).toBe(true);
    expect(result.stashed).toBe(false);
    expect(result.removedNodeModules).toBe(false);
  });

  test("removes node_modules from git tracking", () => {
    // Simulate node_modules being tracked in git
    mkdirSync(join(repoDir, "node_modules", "some-pkg"), { recursive: true });
    writeFileSync(
      join(repoDir, "node_modules", "some-pkg", "index.js"),
      "module.exports = {};",
    );
    execSync("git add -f node_modules/", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Accidentally committed node_modules"', {
      cwd: repoDir,
      stdio: "pipe",
    });

    const result = sanitizeMainRepo(repoDir);
    expect(result.success).toBe(true);
    expect(result.removedNodeModules).toBe(true);

    // node_modules should no longer be tracked
    const tracked = execSync("git ls-files", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    expect(tracked).not.toContain("node_modules/");
  });
});

describe("unstashMainRepo", () => {
  test("pops stashed changes after sanitize", () => {
    // Make changes, sanitize (stash), then pop
    mkdirSync(join(repoDir, ".claude"), { recursive: true });
    writeFileSync(join(repoDir, ".claude", "CLAUDE.md"), "my config\n");

    const sanitizeResult = sanitizeMainRepo(repoDir);
    expect(sanitizeResult.stashed).toBe(true);

    // Pop the stash
    const popped = unstashMainRepo(repoDir);
    expect(popped).toBe(true);

    // The .claude/CLAUDE.md should be back
    expect(existsSync(join(repoDir, ".claude", "CLAUDE.md"))).toBe(true);
    const content = readFileSync(
      join(repoDir, ".claude", "CLAUDE.md"),
      "utf-8",
    );
    expect(content).toContain("my config");
  });

  test("returns true when nothing to pop", () => {
    // No stash
    const result = unstashMainRepo(repoDir);
    expect(result).toBe(true);
  });
});
