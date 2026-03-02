import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  FORBIDDEN_MERGE_PATTERNS,
  sanitizedMerge,
  isForbiddenPath,
} from "../../../src/pipeline/merge-sanitization.js";

let repoDir: string;

/**
 * Setup a git repo with an initial commit and a worktree branch
 * that has both good and forbidden files.
 */
function setupTestRepoWithWorktree(): {
  repoDir: string;
  worktreeDir: string;
  branch: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-sanitize-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  // Create initial commit
  writeFileSync(join(dir, "file.txt"), "initial\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  // Create a worktree branch
  const wtDir = join(dir, ".df-worktrees", "feature-branch");
  mkdirSync(join(dir, ".df-worktrees"), { recursive: true });
  execSync(`git worktree add -b feature-branch "${wtDir}" HEAD`, {
    cwd: dir,
    stdio: "pipe",
  });

  return { repoDir: dir, worktreeDir: wtDir, branch: "feature-branch" };
}

beforeEach(() => {
  const setup = setupTestRepoWithWorktree();
  repoDir = setup.repoDir;
});

afterEach(() => {
  // Clean up worktrees
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(repoDir + "\n") && line.slice(9) !== repoDir) {
        const wtPath = line.slice(9);
        if (wtPath !== repoDir) {
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

describe("FORBIDDEN_MERGE_PATTERNS", () => {
  test("includes .df/state.db pattern", () => {
    expect(FORBIDDEN_MERGE_PATTERNS.some((p) => p.includes("state.db"))).toBe(true);
  });

  test("includes .claude/ pattern", () => {
    expect(FORBIDDEN_MERGE_PATTERNS.some((p) => p.includes(".claude"))).toBe(true);
  });

  test("includes .letta/ pattern", () => {
    expect(FORBIDDEN_MERGE_PATTERNS.some((p) => p.includes(".letta"))).toBe(true);
  });
});

describe("isForbiddenPath", () => {
  test("detects .df/state.db", () => {
    expect(isForbiddenPath(".df/state.db")).toBe(true);
  });

  test("detects .df/state.db-shm", () => {
    expect(isForbiddenPath(".df/state.db-shm")).toBe(true);
  });

  test("detects .df/state.db-wal", () => {
    expect(isForbiddenPath(".df/state.db-wal")).toBe(true);
  });

  test("detects .claude/ files", () => {
    expect(isForbiddenPath(".claude/settings.json")).toBe(true);
  });

  test("detects .letta/ files", () => {
    expect(isForbiddenPath(".letta/config.json")).toBe(true);
  });

  test("allows normal source files", () => {
    expect(isForbiddenPath("src/index.ts")).toBe(false);
  });

  test("allows .df/specs/ files", () => {
    expect(isForbiddenPath(".df/specs/spec_01.md")).toBe(false);
  });
});

describe("sanitizedMerge", () => {
  test("merges clean branch normally", () => {
    const setup = setupTestRepoWithWorktree();
    const { repoDir: repo, worktreeDir, branch } = setup;

    // Add a clean file in the worktree
    writeFileSync(join(worktreeDir, "new-feature.ts"), "export const x = 1;");
    execSync("git add -A", { cwd: worktreeDir, stdio: "pipe" });
    execSync('git commit -m "Add new feature"', { cwd: worktreeDir, stdio: "pipe" });

    const result = sanitizedMerge(repo, branch);
    expect(result.success).toBe(true);
    expect(result.removedFiles).toHaveLength(0);

    // Verify the file was merged
    expect(existsSync(join(repo, "new-feature.ts"))).toBe(true);

    // Clean up
    try {
      execSync(`git worktree remove "${worktreeDir}" --force`, { cwd: repo, stdio: "pipe" });
    } catch { /* ignore */ }
    rmSync(repo, { recursive: true, force: true });
  });

  test("strips .df/state.db files from merge", () => {
    const setup = setupTestRepoWithWorktree();
    const { repoDir: repo, worktreeDir, branch } = setup;

    // Add both a good file and a forbidden file
    writeFileSync(join(worktreeDir, "good.ts"), "export const good = true;");
    mkdirSync(join(worktreeDir, ".df"), { recursive: true });
    writeFileSync(join(worktreeDir, ".df", "state.db-wal"), "stale wal data");
    execSync("git add -f -A", { cwd: worktreeDir, stdio: "pipe" });
    execSync('git commit -m "Add good file and stale db"', { cwd: worktreeDir, stdio: "pipe" });

    const result = sanitizedMerge(repo, branch);
    expect(result.success).toBe(true);
    expect(result.removedFiles).toContain(".df/state.db-wal");

    // Good file should exist
    expect(existsSync(join(repo, "good.ts"))).toBe(true);
    // State DB file should NOT exist
    expect(existsSync(join(repo, ".df", "state.db-wal"))).toBe(false);

    // Clean up
    try {
      execSync(`git worktree remove "${worktreeDir}" --force`, { cwd: repo, stdio: "pipe" });
    } catch { /* ignore */ }
    rmSync(repo, { recursive: true, force: true });
  });

  test("strips .claude/ files from merge", () => {
    const setup = setupTestRepoWithWorktree();
    const { repoDir: repo, worktreeDir, branch } = setup;

    writeFileSync(join(worktreeDir, "code.ts"), "// code");
    mkdirSync(join(worktreeDir, ".claude"), { recursive: true });
    writeFileSync(join(worktreeDir, ".claude", "settings.json"), "{}");
    execSync("git add -f -A", { cwd: worktreeDir, stdio: "pipe" });
    execSync('git commit -m "Add code and claude settings"', { cwd: worktreeDir, stdio: "pipe" });

    const result = sanitizedMerge(repo, branch);
    expect(result.success).toBe(true);
    expect(result.removedFiles).toContain(".claude/settings.json");

    // Good file should exist
    expect(existsSync(join(repo, "code.ts"))).toBe(true);
    // Claude file should NOT exist
    expect(existsSync(join(repo, ".claude", "settings.json"))).toBe(false);

    // Clean up
    try {
      execSync(`git worktree remove "${worktreeDir}" --force`, { cwd: repo, stdio: "pipe" });
    } catch { /* ignore */ }
    rmSync(repo, { recursive: true, force: true });
  });

  test("reports conflict when merge fails", () => {
    const setup = setupTestRepoWithWorktree();
    const { repoDir: repo, worktreeDir, branch } = setup;

    // Create a conflicting change on main
    writeFileSync(join(repo, "file.txt"), "main version\n");
    execSync("git add -A", { cwd: repo, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repo, stdio: "pipe" });

    // Create a conflicting change on the branch
    writeFileSync(join(worktreeDir, "file.txt"), "branch version\n");
    execSync("git add -A", { cwd: worktreeDir, stdio: "pipe" });
    execSync('git commit -m "Branch change"', { cwd: worktreeDir, stdio: "pipe" });

    const result = sanitizedMerge(repo, branch);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Clean up
    try {
      execSync(`git worktree remove "${worktreeDir}" --force`, { cwd: repo, stdio: "pipe" });
    } catch { /* ignore */ }
    rmSync(repo, { recursive: true, force: true });
  });
});
