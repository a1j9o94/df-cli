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

import { createWorktree, removeWorktree } from "../../../src/runtime/worktree.js";
import { PROTECTED_PATTERNS, generateWorktreeGitignore } from "../../../src/runtime/protected-paths.js";

let repoDir: string;

/**
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-worktree-isolation-test-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  // Create initial commit
  writeFileSync(join(dir, "README.md"), "# Test Project\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

beforeEach(() => {
  repoDir = setupTestRepo();
});

afterEach(() => {
  // Clean up worktrees
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

describe("worktree creation with gitignore injection", () => {
  test("createWorktree injects .gitignore with protected paths", () => {
    const wtDir = join(tmpdir(), `df-wt-test-gitignore-${Date.now()}`);

    const wt = createWorktree(repoDir, "test-branch", wtDir);

    // Verify .gitignore was created in the worktree
    const gitignorePath = join(wt.path, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);

    const content = readFileSync(gitignorePath, "utf-8");
    // Should contain all protected patterns
    for (const pattern of PROTECTED_PATTERNS) {
      expect(content).toContain(pattern);
    }
  });

  test("worktree .gitignore prevents staging state.db files", () => {
    const wtDir = join(tmpdir(), `df-wt-test-staging-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-staging", wtDir);

    // Create .df directory and state.db files in worktree
    mkdirSync(join(wt.path, ".df"), { recursive: true });
    writeFileSync(join(wt.path, ".df", "state.db"), "fake db");
    writeFileSync(join(wt.path, ".df", "state.db-shm"), "fake shm");
    writeFileSync(join(wt.path, ".df", "state.db-wal"), "fake wal");

    // Try to add them
    execSync("git add -A", { cwd: wt.path, stdio: "pipe" });

    // Check staged files - state.db files should NOT be staged
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).not.toContain("state.db");
    expect(staged).not.toContain("state.db-shm");
    expect(staged).not.toContain("state.db-wal");
  });

  test("worktree .gitignore prevents staging .claude/ files", () => {
    const wtDir = join(tmpdir(), `df-wt-test-claude-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-claude", wtDir);

    // Create .claude directory with files
    mkdirSync(join(wt.path, ".claude"), { recursive: true });
    writeFileSync(join(wt.path, ".claude", "settings.json"), "{}");
    writeFileSync(join(wt.path, ".claude", "CLAUDE.md"), "# Claude");

    // Try to add them
    execSync("git add -A", { cwd: wt.path, stdio: "pipe" });

    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).not.toContain(".claude/");
    expect(staged).not.toContain("settings.json");
    expect(staged).not.toContain("CLAUDE.md");
  });

  test("worktree .gitignore prevents staging .letta/ files", () => {
    const wtDir = join(tmpdir(), `df-wt-test-letta-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-letta", wtDir);

    // Create .letta directory with files
    mkdirSync(join(wt.path, ".letta"), { recursive: true });
    writeFileSync(join(wt.path, ".letta", "sync.json"), "{}");

    // Try to add them
    execSync("git add -A", { cwd: wt.path, stdio: "pipe" });

    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).not.toContain(".letta/");
  });

  test("worktree allows staging normal project files", () => {
    const wtDir = join(tmpdir(), `df-wt-test-normal-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-normal", wtDir);

    // Create normal project files
    mkdirSync(join(wt.path, "src"), { recursive: true });
    writeFileSync(join(wt.path, "src", "index.ts"), 'console.log("hello")');
    writeFileSync(join(wt.path, "package.json"), "{}");

    // Add them
    execSync("git add -A", { cwd: wt.path, stdio: "pipe" });

    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).toContain("src/index.ts");
    expect(staged).toContain("package.json");
  });

  test("worktree allows staging .df/specs/ files (not protected)", () => {
    const wtDir = join(tmpdir(), `df-wt-test-specs-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-specs", wtDir);

    // Create .df/specs directory
    mkdirSync(join(wt.path, ".df", "specs"), { recursive: true });
    writeFileSync(join(wt.path, ".df", "specs", "spec_01.md"), "# Spec");

    // Add them
    execSync("git add -A", { cwd: wt.path, stdio: "pipe" });

    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).toContain(".df/specs/spec_01.md");
  });

  test("worktree .gitignore content matches generateWorktreeGitignore()", () => {
    const wtDir = join(tmpdir(), `df-wt-test-match-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-match", wtDir);

    const gitignorePath = join(wt.path, ".gitignore");
    const actual = readFileSync(gitignorePath, "utf-8");
    const expected = generateWorktreeGitignore();

    expect(actual).toBe(expected);
  });
});

describe("worktree isolation - state.db cannot be committed", () => {
  test("state.db files are excluded even with explicit git add", () => {
    const wtDir = join(tmpdir(), `df-wt-test-explicit-${Date.now()}`);
    const wt = createWorktree(repoDir, "test-explicit", wtDir);

    // Create state.db files
    mkdirSync(join(wt.path, ".df"), { recursive: true });
    writeFileSync(join(wt.path, ".df", "state.db"), "fake db");
    writeFileSync(join(wt.path, ".df", "state.db-shm"), "fake shm");

    // Try explicit git add of protected files
    try {
      execSync("git add .df/state.db .df/state.db-shm", {
        cwd: wt.path,
        stdio: "pipe",
      });
    } catch {
      // git add may fail for ignored files, which is expected
    }

    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: wt.path,
      encoding: "utf-8",
    }).trim();

    expect(staged).not.toContain("state.db");
  });
});
