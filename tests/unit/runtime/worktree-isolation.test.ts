import { describe, test, expect, beforeEach, afterEach } from "bun:test";
<<<<<<< HEAD
import { execSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  existsSync,
} from "node:fs";
=======
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createWorktree, removeWorktree } from "../../../src/runtime/worktree.js";
<<<<<<< HEAD
import { PROTECTED_PATTERNS, generateWorktreeGitignore } from "../../../src/runtime/protected-paths.js";
=======
import {
  WORKTREE_GITIGNORE_PATTERNS,
  writeWorktreeGitignore,
  verifyWorktreeIsolation,
} from "../../../src/runtime/worktree-isolation.js";
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda

let repoDir: string;

/**
<<<<<<< HEAD
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-worktree-isolation-test-"));
=======
 * Create a minimal git repo for worktree testing.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-wt-isolation-"));
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

<<<<<<< HEAD
  // Create initial commit
  writeFileSync(join(dir, "README.md"), "# Test Project\n");
=======
  writeFileSync(join(dir, "file.txt"), "initial content\n");
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
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
<<<<<<< HEAD
          // ignore
=======
          /* ignore */
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
        }
      }
    }
  } catch {
<<<<<<< HEAD
    // ignore
=======
    /* ignore */
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
<<<<<<< HEAD
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
=======
    /* ignore */
  }
});

describe("WORKTREE_GITIGNORE_PATTERNS", () => {
  test("includes state.db and WAL/SHM patterns", () => {
    expect(WORKTREE_GITIGNORE_PATTERNS).toContain(".df/state.db*");
  });

  test("includes worktrees directory", () => {
    expect(WORKTREE_GITIGNORE_PATTERNS).toContain(".df/worktrees/");
  });

  test("includes logs directory", () => {
    expect(WORKTREE_GITIGNORE_PATTERNS).toContain(".df/logs/");
  });

  test("includes .claude directory", () => {
    expect(WORKTREE_GITIGNORE_PATTERNS).toContain(".claude/");
  });

  test("includes .letta directory", () => {
    expect(WORKTREE_GITIGNORE_PATTERNS).toContain(".letta/");
  });
});

describe("writeWorktreeGitignore", () => {
  test("creates .gitignore file in the given directory", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-gi-"));
    writeWorktreeGitignore(targetDir);

    const gitignorePath = join(targetDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);

    rmSync(targetDir, { recursive: true, force: true });
  });

  test(".gitignore contains all required patterns", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-gi-"));
    writeWorktreeGitignore(targetDir);

    const content = readFileSync(join(targetDir, ".gitignore"), "utf-8");
    for (const pattern of WORKTREE_GITIGNORE_PATTERNS) {
      expect(content).toContain(pattern);
    }

    rmSync(targetDir, { recursive: true, force: true });
  });

  test("appends to existing .gitignore without removing existing content", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-gi-"));
    writeFileSync(join(targetDir, ".gitignore"), "node_modules/\n");
    writeWorktreeGitignore(targetDir);

    const content = readFileSync(join(targetDir, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".df/state.db*");

    rmSync(targetDir, { recursive: true, force: true });
  });
});

describe("verifyWorktreeIsolation", () => {
  test("returns true when .gitignore is properly configured", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-verify-"));
    writeWorktreeGitignore(targetDir);

    const result = verifyWorktreeIsolation(targetDir);
    expect(result.valid).toBe(true);
    expect(result.missingPatterns).toHaveLength(0);

    rmSync(targetDir, { recursive: true, force: true });
  });

  test("returns false when .gitignore is missing", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-verify-"));

    const result = verifyWorktreeIsolation(targetDir);
    expect(result.valid).toBe(false);
    expect(result.missingPatterns.length).toBeGreaterThan(0);

    rmSync(targetDir, { recursive: true, force: true });
  });

  test("returns false when .gitignore is missing some patterns", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "df-wt-verify-"));
    writeFileSync(join(targetDir, ".gitignore"), ".df/state.db*\n");

    const result = verifyWorktreeIsolation(targetDir);
    expect(result.valid).toBe(false);
    expect(result.missingPatterns.length).toBeGreaterThan(0);

    rmSync(targetDir, { recursive: true, force: true });
  });
});

describe("createWorktree integration with isolation", () => {
  test("worktree gitignore prevents state.db from being tracked", () => {
    const wtDir = join(repoDir, ".df-test-worktrees", "test-branch");
    mkdirSync(join(repoDir, ".df-test-worktrees"), { recursive: true });

    const info = createWorktree(repoDir, "test-branch", wtDir);

    // Write the gitignore to the worktree
    writeWorktreeGitignore(info.path);

    // Create a fake state.db file in the worktree
    mkdirSync(join(info.path, ".df"), { recursive: true });
    writeFileSync(join(info.path, ".df", "state.db"), "fake db");
    writeFileSync(join(info.path, ".df", "state.db-shm"), "fake shm");
    writeFileSync(join(info.path, ".df", "state.db-wal"), "fake wal");

    // Check that git status doesn't show the state.db files
    const status = execSync("git status --porcelain", {
      cwd: info.path,
      encoding: "utf-8",
    });

    // The .gitignore should appear (new file), but not the .df/state.db* files
    expect(status).not.toContain(".df/state.db-shm");
    expect(status).not.toContain(".df/state.db-wal");
    // state.db might match the glob pattern too
    expect(status).not.toMatch(/\.df\/state\.db[^*]/);
  });

  test("createWorktree automatically applies isolation gitignore", () => {
    const wtDir = join(repoDir, ".df-test-worktrees", "auto-iso-branch");
    mkdirSync(join(repoDir, ".df-test-worktrees"), { recursive: true });

    const info = createWorktree(repoDir, "auto-iso-branch", wtDir);

    // The .gitignore should already exist with isolation patterns
    const gitignorePath = join(info.path, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);

    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain(".df/state.db*");
    expect(content).toContain(".claude/");
    expect(content).toContain(".letta/");
  });

  test("createWorktree installs pre-commit hook that rejects .df/state.db*", () => {
    const wtDir = join(repoDir, ".df-test-worktrees", "hook-branch");
    mkdirSync(join(repoDir, ".df-test-worktrees"), { recursive: true });

    const info = createWorktree(repoDir, "hook-branch", wtDir);

    // Check that the pre-commit hook exists
    // In a worktree, .git is a file pointing to the main repo's .git/worktrees/<branch>
    const gitDirContent = readFileSync(join(info.path, ".git"), "utf-8").trim();
    const gitDirPath = gitDirContent.replace("gitdir: ", "");
    const hookPath = join(gitDirPath, "hooks", "pre-commit");

    expect(existsSync(hookPath)).toBe(true);

    const hookContent = readFileSync(hookPath, "utf-8");
    expect(hookContent).toContain("state.db");
  });

  test("pre-commit hook prevents committing .df/state.db files", () => {
    const wtDir = join(repoDir, ".df-test-worktrees", "reject-branch");
    mkdirSync(join(repoDir, ".df-test-worktrees"), { recursive: true });

    const info = createWorktree(repoDir, "reject-branch", wtDir);

    // Force-add a state.db file despite gitignore
    mkdirSync(join(info.path, ".df"), { recursive: true });
    writeFileSync(join(info.path, ".df", "state.db-shm"), "bad data");

    try {
      // Force-add bypasses gitignore
      execSync("git add -f .df/state.db-shm", {
        cwd: info.path,
        stdio: "pipe",
      });
      // Attempt to commit — the hook should reject it
      execSync('git commit -m "Try to commit state.db"', {
        cwd: info.path,
        stdio: "pipe",
      });
      // If we get here, the hook didn't reject — fail the test
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      // The commit should fail because of the pre-commit hook
      expect(err.status).not.toBe(0);
    }
>>>>>>> df-build/run_01KJ/worktree-isolation-mm92yzda
  });
});
