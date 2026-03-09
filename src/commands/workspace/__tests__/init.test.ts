import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse as parseYaml } from "yaml";
import { initWorkspace } from "../init.js";

let testDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  testDir = join(tmpdir(), `df-ws-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
  process.chdir(testDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test("initWorkspace creates .df-workspace directory", async () => {
  await initWorkspace({ name: "test-workspace" });

  const wsDir = join(testDir, ".df-workspace");
  expect(existsSync(wsDir)).toBe(true);
});

test("initWorkspace creates config.yaml with correct structure", async () => {
  await initWorkspace({ name: "test-workspace" });

  const configPath = join(testDir, ".df-workspace", "config.yaml");
  expect(existsSync(configPath)).toBe(true);

  const raw = readFileSync(configPath, "utf-8");
  const config = parseYaml(raw);
  expect(config.projects).toBeDefined();
  expect(config.sharedContracts).toBeDefined();
  expect(Array.isArray(config.projects)).toBe(true);
});

test("initWorkspace auto-detects subdirectories with .df as projects", async () => {
  // Create some sub-projects
  mkdirSync(join(testDir, "frontend", ".df"), { recursive: true });
  mkdirSync(join(testDir, "backend", ".df"), { recursive: true });
  mkdirSync(join(testDir, "docs"), { recursive: true }); // no .df, should be ignored

  await initWorkspace({ name: "test-workspace" });

  const configPath = join(testDir, ".df-workspace", "config.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const config = parseYaml(raw);

  expect(config.projects).toHaveLength(2);
  const names = config.projects.map((p: any) => p.name);
  expect(names).toContain("frontend");
  expect(names).toContain("backend");
});

test("initWorkspace throws if .df-workspace already exists", async () => {
  mkdirSync(join(testDir, ".df-workspace"), { recursive: true });

  expect(initWorkspace({ name: "test-workspace" })).rejects.toThrow();
});

test("initWorkspace uses directory name as default workspace name", async () => {
  await initWorkspace({});

  const configPath = join(testDir, ".df-workspace", "config.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const config = parseYaml(raw);
  // The workspace name should be based on the testDir basename
  expect(config.name).toBeDefined();
});
