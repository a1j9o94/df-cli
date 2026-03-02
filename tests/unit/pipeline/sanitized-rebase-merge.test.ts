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
  rebaseAndMerge,
} from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-sanitize-merge-"));
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
  // Clean up worktrees before deleting repo
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(repoDir)) {
        const wtPath = line.slice(9);
        if (wtPath !== repoDir) {
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
    }
  } catch {
    // ignore
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("rebaseAndMerge with pre-rebase sanitization", () => {
  test("scenario 1: dirty worktree auto-cleaned before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "dirty-builder");

    // Builder did work but didn't commit everything
    writeFileSync(join(wtDir, "committed.ts"), "export const a = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Builder work"', { cwd: wtDir, stdio: "pipe" });

    // Builder left uncommitted changes
    writeFileSync(join(wtDir, "uncommitted.ts"), "export const b = 2;\n");

    // Advance main
    writeFileSync(join(repoDir, "main-change.txt"), "main change\n");
    execSync("git add -A", { cwd: repoDir, stdio: "pipe" });
    execSync('git commit -m "Main change"', { cwd: repoDir, stdio: "pipe" });

    // Merge should succeed — dirty worktree should be auto-sanitized
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);

    // Both files should be in main
    expect(existsSync(join(repoDir, "committed.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "uncommitted.ts"))).toBe(true);
  });

  test("scenario 2: protected files removed before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-protected");

    // Builder committed both real work and protected files
    writeFileSync(join(wtDir, "feature.ts"), "export function feature() {}\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "stale wal data");
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature with state.db"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Feature should be in main
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // Protected files should NOT be in main
    expect(existsSync(join(repoDir, ".df", "state.db-wal"))).toBe(false);
  });

  test("scenario 3: node_modules removed before rebase", () => {
    const wtDir = createWorktreeBranch(repoDir, "has-modules");

    // Builder installed and committed node_modules
    writeFileSync(join(wtDir, "app.ts"), "import x from 'x';\n");
    mkdirSync(join(wtDir, "node_modules", "x"), { recursive: true });
    writeFileSync(join(wtDir, "node_modules", "x", "index.js"), "module.exports = 1;");
    execSync("git add -f -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "App with node_modules"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // App code should be in main
    expect(existsSync(join(repoDir, "app.ts"))).toBe(true);

    // node_modules should NOT be in main
    expect(existsSync(join(repoDir, "node_modules"))).toBe(false);
  });

  test("scenario 4: clean worktree passes through normally", () => {
    const wtDir = createWorktreeBranch(repoDir, "clean-builder");

    writeFileSync(join(wtDir, "clean.ts"), "export const clean = true;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Clean feature"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(1);
    expect(existsSync(join(repoDir, "clean.ts"))).toBe(true);
  });

  test("scenario 5: main repo stashed and restored", () => {
    const wtDir = createWorktreeBranch(repoDir, "feature-main-dirty");

    // Builder makes a clean commit
    writeFileSync(join(wtDir, "feature.ts"), "export const f = 1;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Builder feature"', { cwd: wtDir, stdio: "pipe" });

    // Main has uncommitted .claude/CLAUDE.md changes
    mkdirSync(join(repoDir, ".claude"), { recursive: true });
    writeFileSync(join(repoDir, ".claude", "CLAUDE.md"), "session config\n");

    // Merge should still succeed
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Feature merged in
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // .claude/CLAUDE.md should be restored from stash
    expect(existsSync(join(repoDir, ".claude", "CLAUDE.md"))).toBe(true);
    const content = readFileSync(join(repoDir, ".claude", "CLAUDE.md"), "utf-8");
    expect(content).toContain("session config");
  });

  test("multiple dirty worktrees all get sanitized", () => {
    const wt1 = createWorktreeBranch(repoDir, "dirty-1");
    const wt2 = createWorktreeBranch(repoDir, "dirty-2");

    // Both builders leave uncommitted work
    writeFileSync(join(wt1, "feature1.ts"), "export const one = 1;\n");
    writeFileSync(join(wt2, "feature2.ts"), "export const two = 2;\n");
    // Don't commit — both are dirty

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // Both features should be in main
    expect(existsSync(join(repoDir, "feature1.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "feature2.ts"))).toBe(true);
  });
});
