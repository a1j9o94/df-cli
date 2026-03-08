import { test, expect, describe, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { listAgentsFiltered } from "../../../src/db/queries/agent-queries.js";
import { formatAgentListEntry } from "../../../src/utils/format-agent-list.js";
import { agentListCommand } from "../../../src/commands/agent/list.js";

describe("dark agent list enriched", () => {
  let db: SqliteDb;
  const runId = "run_01TEST";

  beforeEach(() => {
    db = getDbForTest();

    // Create a run
    db.prepare(
      "INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)"
    ).run(runId, "spec_01TEST", "running");

    // Running agent
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, worktree_path, cost_usd, tokens_used, last_heartbeat, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "agt_RUNNING", runId, "builder", "builder-parser", "running", 12345,
      "parser", "/tmp/wt/parser", 0.62, 15234,
      new Date(Date.now() - 120000).toISOString(),
      new Date(Date.now() - 740000).toISOString(),
      new Date().toISOString()
    );

    // Completed agent
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, total_active_ms, cost_usd, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "agt_DONE", runId, "builder", "builder-lexer", "completed",
      "lexer", 300000, 1.25, 45000,
      new Date(Date.now() - 600000).toISOString(),
      new Date().toISOString()
    );

    // Failed agent (dead)
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "agt_DEAD", runId, "builder", "builder-codegen", "failed",
      "codegen", "tests failed",
      new Date(Date.now() - 500000).toISOString(),
      new Date().toISOString()
    );
  });

  describe("--active flag filtering", () => {
    test("agentListCommand accepts --active flag", () => {
      const activeOpt = agentListCommand.options.find(o => o.long === "--active");
      expect(activeOpt).toBeDefined();
    });

    test("--active returns only running/pending/spawning agents", () => {
      const active = listAgentsFiltered(db, { runId, active: true });
      expect(active.length).toBe(1);
      expect(active[0].id).toBe("agt_RUNNING");
    });

    test("without --active returns all agents", () => {
      const all = listAgentsFiltered(db, { runId });
      expect(all.length).toBe(3);
    });
  });

  describe("--module flag filtering", () => {
    test("agentListCommand accepts --module flag", () => {
      const moduleOpt = agentListCommand.options.find(o => o.long === "--module");
      expect(moduleOpt).toBeDefined();
    });

    test("--module filters by module_id", () => {
      const result = listAgentsFiltered(db, { runId, moduleId: "parser" });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("agt_RUNNING");
    });
  });

  describe("enriched output format", () => {
    test("formatAgentListEntry shows elapsed time", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent);
      // Running agent should show elapsed time (some form of minutes/seconds)
      expect(output).toMatch(/\d+m\s+\d+s|\d+s/);
    });

    test("formatAgentListEntry shows cost", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent);
      expect(output).toContain("$0.62");
    });

    test("formatAgentListEntry shows files changed when provided", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent, { filesChanged: 3 });
      expect(output).toContain("3 files");
    });

    test("formatAgentListEntry shows module", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent);
      expect(output).toContain("module=parser");
    });

    test("formatAgentListEntry shows worktree path", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent);
      expect(output).toContain("worktree: /tmp/wt/parser");
    });

    test("formatAgentListEntry shows last heartbeat", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_RUNNING") as any;
      const output = formatAgentListEntry(agent);
      expect(output).toContain("last heartbeat:");
      expect(output).toMatch(/\d+m ago|just now|\d+s ago/);
    });

    test("completed agents show elapsed from total_active_ms", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_DONE") as any;
      const output = formatAgentListEntry(agent);
      // 300000ms = 5m 0s
      expect(output).toContain("5m 0s");
    });

    test("completed agents show cost", () => {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("agt_DONE") as any;
      const output = formatAgentListEntry(agent);
      expect(output).toContain("$1.25");
    });
  });
});
