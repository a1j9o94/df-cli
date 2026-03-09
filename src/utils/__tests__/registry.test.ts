import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadRegistry,
  registerProject,
  unregisterProject,
  pruneRegistry,
  getRegistryPath,
} from "../registry.js";
import type { RegistryEntry } from "../../types/workspace.js";

// Override HOME for test isolation
let originalHome: string;
let testHome: string;

beforeEach(() => {
  originalHome = process.env.HOME!;
  testHome = join(tmpdir(), `df-registry-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testHome, { recursive: true });
  process.env.HOME = testHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
  if (existsSync(testHome)) {
    rmSync(testHome, { recursive: true, force: true });
  }
});

test("getRegistryPath returns ~/.dark/registry.yaml", () => {
  const registryPath = getRegistryPath();
  expect(registryPath).toBe(join(testHome, ".dark", "registry.yaml"));
});

test("loadRegistry returns empty array when no registry file exists", () => {
  const entries = loadRegistry();
  expect(entries).toEqual([]);
});

test("registerProject creates registry file and adds entry", () => {
  const entry: RegistryEntry = {
    name: "test-project",
    path: "/tmp/test-project",
    type: "project",
  };
  registerProject(entry);

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe("test-project");
  expect(entries[0].path).toBe("/tmp/test-project");
  expect(entries[0].type).toBe("project");
});

test("registerProject updates existing entry by path", () => {
  const entry1: RegistryEntry = {
    name: "old-name",
    path: "/tmp/test-project",
    type: "project",
  };
  const entry2: RegistryEntry = {
    name: "new-name",
    path: "/tmp/test-project",
    type: "project",
  };
  registerProject(entry1);
  registerProject(entry2);

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe("new-name");
});

test("registerProject can add multiple entries", () => {
  registerProject({ name: "project-a", path: "/tmp/a", type: "project" });
  registerProject({ name: "project-b", path: "/tmp/b", type: "project" });
  registerProject({ name: "workspace-c", path: "/tmp/c", type: "workspace" });

  const entries = loadRegistry();
  expect(entries).toHaveLength(3);
});

test("unregisterProject removes entry by path", () => {
  registerProject({ name: "project-a", path: "/tmp/a", type: "project" });
  registerProject({ name: "project-b", path: "/tmp/b", type: "project" });

  unregisterProject("/tmp/a");

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe("project-b");
});

test("unregisterProject is no-op for non-existent path", () => {
  registerProject({ name: "project-a", path: "/tmp/a", type: "project" });

  unregisterProject("/tmp/nonexistent");

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
});

test("pruneRegistry removes entries with non-existent paths", () => {
  // Register a project at a real path and a fake path
  const realPath = testHome;
  registerProject({ name: "real", path: realPath, type: "project" });
  registerProject({ name: "fake", path: "/tmp/definitely-not-real-path-xyz123", type: "project" });

  const result = pruneRegistry();
  expect(result.removed).toContain("/tmp/definitely-not-real-path-xyz123");
  expect(result.remaining).toContain(realPath);

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe("real");
});

test("loadRegistry parses existing registry file", () => {
  const darkDir = join(testHome, ".dark");
  mkdirSync(darkDir, { recursive: true });
  const yamlContent = `entries:
  - name: existing
    path: /tmp/existing
    type: project
    lastRunStatus: completed
    lastRunDate: "2026-01-01"
`;
  writeFileSync(join(darkDir, "registry.yaml"), yamlContent);

  const entries = loadRegistry();
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe("existing");
  expect(entries[0].lastRunStatus).toBe("completed");
  expect(entries[0].lastRunDate).toBe("2026-01-01");
});
