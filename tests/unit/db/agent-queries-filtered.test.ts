import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import Database from "bun:sqlite";
import {
  listAgentsFiltered,
  getLatestAgentPerModule,
} from "../../../src/db/queries/agent-queries.js";

describe("listAgentsFiltered", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      pid INTEGER,
      module_id TEXT,
      buildplan_id TEXT,
      worktree_path TEXT,
      branch_name TEXT,
      session_id TEXT,
      system_prompt TEXT,
      tdd_phase TEXT,
      tdd_cycles INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      queue_wait_ms INTEGER DEFAULT 0,
      total_active_ms INTEGER DEFAULT 0,
      last_heartbeat TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    const now = new Date().toISOString();
    // Insert test agents
    const insert = db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, cost_usd, tokens_used, tdd_cycles, queue_wait_ms, total_active_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)`
    );
    insert.run("agt_1", "run_01", "builder", "builder-foo", "running", 111, "foo", now, now);
    insert.run("agt_2", "run_01", "builder", "builder-bar", "completed", null, "bar", now, now);
    insert.run("agt_3", "run_01", "architect", "architect-main", "completed", null, null, now, now);
    insert.run("agt_4", "run_02", "builder", "builder-baz", "running", 222, "baz", now, now);
    insert.run("agt_5", "run_01", "builder", "builder-foo-retry", "failed", null, "foo", now, now);
  });

  afterEach(() => {
    db.close();
  });

  test("returns all agents with no filters", () => {
    const agents = listAgentsFiltered(db as any);
    expect(agents.length).toBe(5);
  });

  test("filters by run_id", () => {
    const agents = listAgentsFiltered(db as any, { runId: "run_01" });
    expect(agents.length).toBe(4);
    expect(agents.every((a) => a.run_id === "run_01")).toBe(true);
  });

  test("filters by role", () => {
    const agents = listAgentsFiltered(db as any, { role: "builder" });
    expect(agents.length).toBe(4);
  });

  test("filters by active status", () => {
    const agents = listAgentsFiltered(db as any, { active: true });
    expect(agents.length).toBe(2);
    expect(agents.every((a) => ["pending", "spawning", "running"].includes(a.status))).toBe(true);
  });

  test("filters by module_id", () => {
    const agents = listAgentsFiltered(db as any, { moduleId: "foo" });
    expect(agents.length).toBe(2); // agt_1 and agt_5
  });

  test("combines multiple filters", () => {
    const agents = listAgentsFiltered(db as any, {
      runId: "run_01",
      role: "builder",
      active: true,
    });
    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe("agt_1");
  });
});

describe("getLatestAgentPerModule", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      pid INTEGER,
      module_id TEXT,
      buildplan_id TEXT,
      worktree_path TEXT,
      branch_name TEXT,
      session_id TEXT,
      system_prompt TEXT,
      tdd_phase TEXT,
      tdd_cycles INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      queue_wait_ms INTEGER DEFAULT 0,
      total_active_ms INTEGER DEFAULT 0,
      last_heartbeat TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, cost_usd, tokens_used, tdd_cycles, queue_wait_ms, total_active_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)`
    );
    // First attempt for module foo — failed
    insert.run("agt_1", "run_01", "builder", "builder-foo-1", "failed", "foo", now, now);
    // Second attempt for module foo — running (latest)
    insert.run("agt_2", "run_01", "builder", "builder-foo-2", "running", "foo", now, now);
    // Only attempt for module bar
    insert.run("agt_3", "run_01", "builder", "builder-bar", "completed", "bar", now, now);
    // Architect (no module_id)
    insert.run("agt_4", "run_01", "architect", "architect-main", "completed", null, now, now);
  });

  afterEach(() => {
    db.close();
  });

  test("returns latest agent per module", () => {
    const agents = getLatestAgentPerModule(db as any, "run_01");
    const ids = agents.map((a) => a.id).sort();
    // agt_2 (latest foo), agt_3 (bar), agt_4 (architect, no module)
    expect(ids).toEqual(["agt_2", "agt_3", "agt_4"]);
  });

  test("excludes old retry attempts", () => {
    const agents = getLatestAgentPerModule(db as any, "run_01");
    const fooAgents = agents.filter((a) => a.module_id === "foo");
    expect(fooAgents.length).toBe(1);
    expect(fooAgents[0].id).toBe("agt_2");
  });
});
