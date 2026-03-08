import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify as stringifyYaml } from "yaml";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../src/db/schema.js";
import { startServer, type ServerHandle } from "../../src/dashboard/server.js";

let server: ServerHandle;
let tmpDir: string;
let configPath: string;

beforeAll(async () => {
  // Create temp project dir with .df structure
  tmpDir = mkdtempSync(join(tmpdir(), "config-api-test-"));
  const dfDir = join(tmpDir, ".df");
  mkdirSync(dfDir, { recursive: true });
  mkdirSync(join(dfDir, "specs"), { recursive: true });

  configPath = join(dfDir, "config.yaml");
  writeFileSync(
    configPath,
    stringifyYaml({
      project: { name: "test-project", root: ".", branch: "main" },
      build: { max_parallel: 4, budget_usd: 50, max_iterations: 3, skip_change_eval: false },
      runtime: {
        agent_binary: "claude",
        heartbeat_interval_ms: 30000,
        heartbeat_timeout_ms: 90000,
        max_agent_lifetime_ms: 2700000,
      },
      thresholds: { satisfaction: 0.8, changeability: 0.6 },
      resources: { max_worktrees: 6, max_api_slots: 4 },
    }),
  );

  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  server = await startServer({ port: 0, db, specsDir: join(dfDir, "specs"), configDir: dfDir });
});

afterAll(() => {
  server?.stop();
});

describe("GET /api/config", () => {
  test("returns current config as JSON", async () => {
    const res = await fetch(`${server.url}/api/config`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.build).toBeDefined();
    expect(data.build.max_parallel).toBe(4);
    expect(data.build.budget_usd).toBe(50);
    expect(data.thresholds.satisfaction).toBe(0.8);
  });

  test("returns defaults metadata indicating which values are defaults", async () => {
    const res = await fetch(`${server.url}/api/config`);
    const data = await res.json();
    // Should have a _defaults object or similar that marks default values
    expect(data._defaults).toBeDefined();
  });
});

describe("PUT /api/config", () => {
  test("updates a single field via partial merge", async () => {
    const res = await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build: { max_parallel: 2 } }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.build.max_parallel).toBe(2);
    // Other fields should be preserved
    expect(data.build.budget_usd).toBe(50);
    expect(data.thresholds.satisfaction).toBe(0.8);
  });

  test("returns full merged config in response", async () => {
    const res = await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholds: { satisfaction: 0.9 } }),
    });

    const data = await res.json();
    // Should return full config, not just changed fields
    expect(data.build).toBeDefined();
    expect(data.thresholds.satisfaction).toBe(0.9);
    expect(data.thresholds.changeability).toBe(0.6);
  });

  test("rejects invalid values with 400", async () => {
    const res = await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build: { budget_usd: -5 } }),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.errors).toBeDefined();
    expect(data.errors.length).toBeGreaterThan(0);
  });

  test("does not modify config file on validation failure", async () => {
    // First read current state
    const before = readFileSync(configPath, "utf-8");

    await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build: { max_parallel: 0 } }),
    });

    const after = readFileSync(configPath, "utf-8");
    expect(after).toBe(before);
  });

  test("persists changes to config.yaml", async () => {
    await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build: { max_parallel: 8 } }),
    });

    // Read config.yaml to verify it was written
    const raw = readFileSync(configPath, "utf-8");
    expect(raw).toContain("max_parallel: 8");
  });

  test("deep merges nested thresholds without overwriting siblings", async () => {
    const res = await fetch(`${server.url}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholds: { satisfaction: 0.7 } }),
    });

    const data = await res.json();
    expect(data.thresholds.satisfaction).toBe(0.7);
    expect(data.thresholds.changeability).toBe(0.6);
  });
});
