import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import Database from "bun:sqlite";
import { agentShowCommand } from "../../../src/commands/agent/show.js";

// We'll test the command logic by testing the handler directly
// For unit tests, we'll test the formatting and query pieces

import { getAgentDetail } from "../../../src/db/queries/agent-queries.js";
import { formatAgentDetail } from "../../../src/utils/format-agent-detail.js";

describe("agent show command", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    // Create minimal schema
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
    db.run(`CREATE TABLE events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_id TEXT,
      type TEXT NOT NULL,
      data TEXT,
      created_at TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      from_agent_id TEXT,
      to_agent_id TEXT,
      to_role TEXT,
      to_contract_id TEXT,
      body TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);
  });

  afterEach(() => {
    db.close();
  });

  test("getAgentDetail returns null for non-existent agent", () => {
    const result = getAgentDetail(db as any, "agt_nonexistent");
    expect(result).toBeNull();
  });

  test("getAgentDetail returns agent with events and messages", () => {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, cost_usd, tokens_used, tdd_cycles, queue_wait_ms, total_active_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["agt_01ABC", "run_01XYZ", "builder", "builder-foo", "running", 12345, "foo", 0.62, 5000, 3, 0, 0, now, now]
    );
    db.run(
      `INSERT INTO events (id, run_id, agent_id, type, created_at) VALUES (?, ?, ?, ?, ?)`,
      ["evt_01", "run_01XYZ", "agt_01ABC", "agent-spawned", now]
    );
    db.run(
      `INSERT INTO messages (id, run_id, from_agent_id, to_agent_id, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["msg_01", "run_01XYZ", "agt_02DEF", "agt_01ABC", "Hello builder", 0, now]
    );

    const result = getAgentDetail(db as any, "agt_01ABC");
    expect(result).not.toBeNull();
    expect(result!.agent.id).toBe("agt_01ABC");
    expect(result!.events.length).toBe(1);
    expect(result!.events[0].type).toBe("agent-spawned");
    expect(result!.messages.length).toBe(1);
    expect(result!.messages[0].body).toBe("Hello builder");
  });

  test("formatAgentDetail outputs all expected fields", () => {
    const now = new Date().toISOString();
    const output = formatAgentDetail({
      agent: {
        id: "agt_01ABC",
        run_id: "run_01XYZ",
        role: "builder",
        name: "builder-foo",
        status: "running",
        pid: 12345,
        module_id: "foo",
        buildplan_id: "plan_01XYZ",
        worktree_path: "/tmp/worktree",
        branch_name: "df-build/foo",
        session_id: null,
        system_prompt: null,
        tdd_phase: "green",
        tdd_cycles: 3,
        cost_usd: 0.62,
        tokens_used: 5000,
        queue_wait_ms: 0,
        total_active_ms: 754000,
        last_heartbeat: new Date(Date.now() - 120000).toISOString(),
        error: null,
        created_at: new Date(Date.now() - 754000).toISOString(),
        updated_at: now,
      },
      events: [],
      messages: [],
    });

    expect(output).toContain("Agent: agt_01ABC");
    expect(output).toContain("builder-foo");
    expect(output).toContain("builder");
    expect(output).toContain("running");
    expect(output).toContain("12345");
    expect(output).toContain("foo");
    expect(output).toContain("/tmp/worktree");
    expect(output).toContain("$0.62");
    expect(output).toContain("5,000");
    expect(output).toContain("green");
  });

  test("agentShowCommand is a valid commander command", () => {
    expect(agentShowCommand).toBeDefined();
    expect(agentShowCommand.name()).toBe("show");
  });
});
