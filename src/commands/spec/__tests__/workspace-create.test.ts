import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWorkspaceSpec } from "../workspace-create.js";

describe("createWorkspaceSpec", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `df-test-ws-spec-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("throws if no .df-workspace/ directory exists", () => {
    expect(() =>
      createWorkspaceSpec({
        title: "Test spec",
        workspaceDir: testDir,
      }),
    ).toThrow(/No .df-workspace\/ directory found/);
  });

  test("creates spec file in .df-workspace/specs/", () => {
    mkdirSync(join(testDir, ".df-workspace"), { recursive: true });

    const specPath = createWorkspaceSpec({
      title: "Add cross-repo auth",
      projects: ["backend", "frontend"],
      workspaceDir: testDir,
    });

    expect(existsSync(specPath)).toBe(true);
    expect(specPath).toContain(".df-workspace/specs/");

    const content = readFileSync(specPath, "utf-8");
    expect(content).toContain("Add cross-repo auth");
    expect(content).toContain("workspace: true");
    expect(content).toContain("  - backend");
    expect(content).toContain("  - frontend");
  });

  test("creates spec with slug in filename", () => {
    mkdirSync(join(testDir, ".df-workspace"), { recursive: true });

    const specPath = createWorkspaceSpec({
      title: "My Amazing Feature",
      workspaceDir: testDir,
    });

    expect(specPath).toContain("my-amazing-feature");
  });

  test("creates specs dir if not exists", () => {
    mkdirSync(join(testDir, ".df-workspace"), { recursive: true });

    createWorkspaceSpec({
      title: "Test",
      workspaceDir: testDir,
    });

    expect(existsSync(join(testDir, ".df-workspace", "specs"))).toBe(true);
  });
});
