import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createProjectWorktree } from "../../pipeline/workspace-build.js";
import type { ProjectRef } from "../../types/workspace.js";

describe("createProjectWorktree — multi-project", () => {
  let testDir: string;
  let backendDir: string;
  let frontendDir: string;
  let backendRef: ProjectRef;
  let frontendRef: ProjectRef;

  beforeEach(() => {
    // Create a temporary workspace with two git repos
    testDir = join(tmpdir(), `df-test-multiproject-${Date.now()}`);
    backendDir = join(testDir, "backend");
    frontendDir = join(testDir, "frontend");

    mkdirSync(backendDir, { recursive: true });
    mkdirSync(frontendDir, { recursive: true });

    // Initialize git repos
    for (const dir of [backendDir, frontendDir]) {
      execSync("git init", { cwd: dir, stdio: "pipe" });
      execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
      execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
      execSync("touch README.md && git add . && git commit -m 'init'", {
        cwd: dir,
        stdio: "pipe",
      });
    }

    backendRef = {
      name: "backend",
      path: backendDir,
      role: "api-provider",
      dfDir: join(backendDir, ".df"),
    };

    frontendRef = {
      name: "frontend",
      path: frontendDir,
      role: "api-consumer",
      dfDir: join(frontendDir, ".df"),
    };
  });

  afterEach(() => {
    // Clean up worktrees before removing dirs
    for (const dir of [backendDir, frontendDir]) {
      try {
        execSync("git worktree prune", { cwd: dir, stdio: "pipe" });
      } catch {}
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates worktree from backend project repo", () => {
    const result = createProjectWorktree(
      backendRef,
      "api-endpoint",
      "df-build/test",
    );

    expect(result.path).toContain("api-endpoint");
    expect(existsSync(result.path)).toBe(true);
    expect(result.branch).toContain("api-endpoint");

    // Clean up worktree
    execSync(`git worktree remove "${result.path}" --force`, {
      cwd: backendDir,
      stdio: "pipe",
    });
  });

  test("creates worktree from frontend project repo", () => {
    const result = createProjectWorktree(
      frontendRef,
      "ui-component",
      "df-build/test",
    );

    expect(result.path).toContain("ui-component");
    expect(existsSync(result.path)).toBe(true);

    // The worktree should be based on frontend repo, not backend
    const remoteOrigin = execSync("git rev-parse --git-common-dir", {
      cwd: result.path,
      encoding: "utf-8",
    }).trim();
    expect(remoteOrigin).toContain("frontend");

    // Clean up
    execSync(`git worktree remove "${result.path}" --force`, {
      cwd: frontendDir,
      stdio: "pipe",
    });
  });

  test("worktrees from different projects are isolated", () => {
    const backendWt = createProjectWorktree(
      backendRef,
      "api-mod",
      "df-build/test",
    );
    const frontendWt = createProjectWorktree(
      frontendRef,
      "ui-mod",
      "df-build/test",
    );

    // Both should exist
    expect(existsSync(backendWt.path)).toBe(true);
    expect(existsSync(frontendWt.path)).toBe(true);

    // They should be in different directories
    expect(backendWt.path).not.toBe(frontendWt.path);

    // Clean up
    execSync(`git worktree remove "${backendWt.path}" --force`, {
      cwd: backendDir,
      stdio: "pipe",
    });
    execSync(`git worktree remove "${frontendWt.path}" --force`, {
      cwd: frontendDir,
      stdio: "pipe",
    });
  });
});
