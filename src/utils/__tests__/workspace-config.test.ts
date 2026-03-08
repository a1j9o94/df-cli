import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify as yamlStringify } from "yaml";
import {
  findWorkspaceDir,
  getWorkspaceConfig,
  resolveProjectPaths,
  detectContext,
} from "../workspace-config.js";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `df-ws-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// --- findWorkspaceDir ---

test("findWorkspaceDir returns null when no .df-workspace exists", () => {
  const result = findWorkspaceDir(testDir);
  expect(result).toBeNull();
});

test("findWorkspaceDir finds .df-workspace in current directory", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  const result = findWorkspaceDir(testDir);
  expect(result).toBe(wsDir);
});

test("findWorkspaceDir finds .df-workspace in parent directory", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  const childDir = join(testDir, "child", "grandchild");
  mkdirSync(childDir, { recursive: true });

  const result = findWorkspaceDir(childDir);
  expect(result).toBe(wsDir);
});

// --- getWorkspaceConfig ---

test("getWorkspaceConfig loads config from .df-workspace/config.yaml", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  const config = {
    projects: [
      { name: "frontend", path: "./frontend", role: "ui" },
      { name: "backend", path: "./backend", role: "api" },
    ],
    sharedContracts: [
      { name: "API Types", file: "contracts/api.ts", type: "typescript", boundProjects: ["frontend", "backend"] },
    ],
  };

  writeFileSync(join(wsDir, "config.yaml"), yamlStringify(config));

  const loaded = getWorkspaceConfig(wsDir);
  expect(loaded.projects).toHaveLength(2);
  expect(loaded.projects[0].name).toBe("frontend");
  expect(loaded.sharedContracts).toHaveLength(1);
  expect(loaded.sharedContracts[0].name).toBe("API Types");
});

test("getWorkspaceConfig returns empty config when config.yaml is missing", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  const loaded = getWorkspaceConfig(wsDir);
  expect(loaded.projects).toEqual([]);
  expect(loaded.sharedContracts).toEqual([]);
});

// --- resolveProjectPaths ---

test("resolveProjectPaths resolves relative paths to absolute", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  // Create project dirs
  const frontendDir = join(testDir, "frontend");
  const backendDir = join(testDir, "backend");
  mkdirSync(join(frontendDir, ".df"), { recursive: true });
  mkdirSync(join(backendDir, ".df"), { recursive: true });

  const config = {
    projects: [
      { name: "frontend", path: "./frontend", role: "ui", dfDir: "" },
      { name: "backend", path: "./backend", role: "api", dfDir: "" },
    ],
    sharedContracts: [],
  };

  const resolved = resolveProjectPaths(wsDir, config);
  expect(resolved).toHaveLength(2);
  expect(resolved[0].path).toBe(frontendDir);
  expect(resolved[0].dfDir).toBe(join(frontendDir, ".df"));
  expect(resolved[1].path).toBe(backendDir);
  expect(resolved[1].dfDir).toBe(join(backendDir, ".df"));
});

// --- detectContext ---

test("detectContext returns 'project' when inside a .df project", () => {
  const projectDir = join(testDir, "my-project");
  mkdirSync(join(projectDir, ".df"), { recursive: true });

  const result = detectContext(projectDir);
  expect(result.type).toBe("project");
  expect(result.path).toBe(join(projectDir, ".df"));
});

test("detectContext returns 'workspace' when inside a .df-workspace", () => {
  const wsDir = join(testDir, ".df-workspace");
  mkdirSync(wsDir, { recursive: true });

  const result = detectContext(testDir);
  expect(result.type).toBe("workspace");
  expect(result.path).toBe(wsDir);
});

test("detectContext returns 'global' when no .df or .df-workspace found", () => {
  const result = detectContext(testDir);
  expect(result.type).toBe("global");
  expect(result.path).toBeNull();
});

test("detectContext prefers project over workspace when both exist", () => {
  // Create a workspace with a project inside
  mkdirSync(join(testDir, ".df-workspace"), { recursive: true });
  const projectDir = join(testDir, "my-project");
  mkdirSync(join(projectDir, ".df"), { recursive: true });

  const result = detectContext(projectDir);
  expect(result.type).toBe("project");
  expect(result.path).toBe(join(projectDir, ".df"));
});
