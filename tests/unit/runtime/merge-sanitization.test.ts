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

import { rebaseAndMerge } from "../../../src/pipeline/rebase-merge.js";

let repoDir: string;

/**
 * Helper to create a test git repo with an initial commit.
 */
function setupTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "df-merge-sanitize-test-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  // Create initial commit with a .df directory
  mkdirSync(join(dir, ".df"), { recursive: true });
  writeFileSync(join(dir, "README.md"), "# Test Project\n");
  writeFileSync(join(dir, ".df", "config.yaml"), "name: test\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

/**
 * Helper to create a worktree branch.
 */
function createWorktreeBranch(mainRepo: string, branchName: string): string {
  const wtDir = mkdtempSync(join(tmpdir(), `df-wt-sanitize-${branchName}-`));
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
    // ignore
  }
});

describe("merge sanitization - protected paths stripped during merge", () => {
  test("state.db files in worktree branch are not merged into main", () => {
    const wtDir = createWorktreeBranch(repoDir, "builder-with-db");

    // Builder commits both code and state.db files (bad behavior)
    writeFileSync(join(wtDir, "feature.ts"), "export const x = 1;\n");
    mkdirSync(join(wtDir, ".df"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "state.db-shm"), "stale shm data");
    writeFileSync(join(wtDir, ".df", "state.db-wal"), "stale wal data");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature + state.db files"', { cwd: wtDir, stdio: "pipe" });

    // Merge should succeed
    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // The feature file should be merged
    expect(existsSync(join(repoDir, "feature.ts"))).toBe(true);

    // But state.db files should NOT be merged
    expect(existsSync(join(repoDir, ".df", "state.db-shm"))).toBe(false);
    expect(existsSync(join(repoDir, ".df", "state.db-wal"))).toBe(false);
  });

  test(".claude/ files in worktree branch are not merged into main", () => {
    const wtDir = createWorktreeBranch(repoDir, "builder-with-claude");

    // Builder commits code and .claude files
    writeFileSync(join(wtDir, "app.ts"), "export const app = true;\n");
    mkdirSync(join(wtDir, ".claude"), { recursive: true });
    writeFileSync(join(wtDir, ".claude", "CLAUDE.md"), "# Agent settings");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature + .claude files"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Code merged
    expect(existsSync(join(repoDir, "app.ts"))).toBe(true);

    // .claude not merged
    expect(existsSync(join(repoDir, ".claude", "CLAUDE.md"))).toBe(false);
  });

  test(".letta/ files in worktree branch are not merged into main", () => {
    const wtDir = createWorktreeBranch(repoDir, "builder-with-letta");

    writeFileSync(join(wtDir, "utils.ts"), "export const util = 1;\n");
    mkdirSync(join(wtDir, ".letta"), { recursive: true });
    writeFileSync(join(wtDir, ".letta", "sync.json"), "{}");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Feature + .letta files"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    expect(existsSync(join(repoDir, "utils.ts"))).toBe(true);
    expect(existsSync(join(repoDir, ".letta", "sync.json"))).toBe(false);
  });

  test("normal .df files (specs, config) ARE merged", () => {
    const wtDir = createWorktreeBranch(repoDir, "builder-with-specs");

    // Builder creates spec files (should be allowed)
    mkdirSync(join(wtDir, ".df", "specs"), { recursive: true });
    writeFileSync(join(wtDir, ".df", "specs", "new-spec.md"), "# New Spec");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Add spec file"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);

    // Spec file should be merged
    expect(existsSync(join(repoDir, ".df", "specs", "new-spec.md"))).toBe(true);
  });

  test("multiple worktrees with protected files are all sanitized", () => {
    const wt1 = createWorktreeBranch(repoDir, "builder-1");
    const wt2 = createWorktreeBranch(repoDir, "builder-2");

    // Builder 1 commits code + state.db
    writeFileSync(join(wt1, "feature1.ts"), "export const f1 = 1;\n");
    mkdirSync(join(wt1, ".df"), { recursive: true });
    writeFileSync(join(wt1, ".df", "state.db-shm"), "builder1 shm");
    execSync("git add -A", { cwd: wt1, stdio: "pipe" });
    execSync('git commit -m "Builder 1"', { cwd: wt1, stdio: "pipe" });

    // Builder 2 commits code + .claude
    writeFileSync(join(wt2, "feature2.ts"), "export const f2 = 2;\n");
    mkdirSync(join(wt2, ".claude"), { recursive: true });
    writeFileSync(join(wt2, ".claude", "settings.json"), "{}");
    execSync("git add -A", { cwd: wt2, stdio: "pipe" });
    execSync('git commit -m "Builder 2"', { cwd: wt2, stdio: "pipe" });

    const result = rebaseAndMerge([wt1, wt2], repoDir, "main");
    expect(result.success).toBe(true);
    expect(result.mergedBranches.length).toBe(2);

    // Code merged from both
    expect(existsSync(join(repoDir, "feature1.ts"))).toBe(true);
    expect(existsSync(join(repoDir, "feature2.ts"))).toBe(true);

    // Protected files NOT merged from either
    expect(existsSync(join(repoDir, ".df", "state.db-shm"))).toBe(false);
    expect(existsSync(join(repoDir, ".claude", "settings.json"))).toBe(false);
  });

  test("merge still works when worktree has no protected files", () => {
    const wtDir = createWorktreeBranch(repoDir, "clean-builder");

    writeFileSync(join(wtDir, "clean.ts"), "export const clean = true;\n");
    execSync("git add -A", { cwd: wtDir, stdio: "pipe" });
    execSync('git commit -m "Clean feature"', { cwd: wtDir, stdio: "pipe" });

    const result = rebaseAndMerge([wtDir], repoDir, "main");
    expect(result.success).toBe(true);
    expect(existsSync(join(repoDir, "clean.ts"))).toBe(true);
  });
});
