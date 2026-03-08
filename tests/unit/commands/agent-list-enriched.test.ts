import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { listAgentsFiltered, getLatestAgentPerModule } from "../../../src/db/queries/agent-queries.js";
import { formatAgentListEntry } from "../../../src/utils/format-agent-list.js";
import { summarizeAgentCounts } from "../../../src/utils/agent-enrichment.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("agent list enriched wiring", () => {
  test("listAgentsFiltered with --active returns only active agents", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'running', pid = 1234 WHERE id = ?").run(a1.id);

    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run(a2.id);

    const a3 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-old", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'failed' WHERE id = ?").run(a3.id);

    const active = listAgentsFiltered(db, { runId, active: true });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("b-parser");
  });

  test("listAgentsFiltered with --module returns only that module's agents", () => {
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });

    const result = listAgentsFiltered(db, { runId, moduleId: "parser" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("b-parser");
  });

  test("getLatestAgentPerModule deduplicates retry attempts", () => {
    // First attempt for parser (failed)
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser-v1", module_id: "parser", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'failed' WHERE id = ?").run(a1.id);

    // Second attempt for parser (running)
    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser-v2", module_id: "parser", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'running' WHERE id = ?").run(a2.id);

    const latest = getLatestAgentPerModule(db, runId);
    const parserAgents = latest.filter(a => a.module_id === "parser");
    expect(parserAgents).toHaveLength(1);
    expect(parserAgents[0].name).toBe("b-parser-v2");
  });

  test("formatAgentListEntry produces multi-line output with worktree and heartbeat", () => {
    const agent = {
      id: "agt_01TEST",
      run_id: runId,
      role: "builder" as const,
      name: "builder-foo",
      status: "running" as const,
      pid: 1234,
      module_id: "foo",
      buildplan_id: null,
      worktree_path: "/tmp/foo-worktree",
      branch_name: null,
      session_id: null,
      system_prompt: null,
      tdd_phase: null,
      tdd_cycles: 0,
      cost_usd: 0.62,
      tokens_used: 5000,
      queue_wait_ms: 0,
      total_active_ms: 0,
      last_heartbeat: new Date(Date.now() - 120000).toISOString(),
      error: null,
      created_at: new Date(Date.now() - 754000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const output = formatAgentListEntry(agent, { filesChanged: 3 });
    // Should have multiple lines
    const lines = output.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Line 1: main info with elapsed, cost, files, module
    expect(lines[0]).toContain("agt_01TEST");
    expect(lines[0]).toContain("running");
    expect(lines[0]).toContain("$0.62");
    expect(lines[0]).toContain("3 files");
    expect(lines[0]).toContain("module=foo");
    // Line 2: worktree
    expect(output).toContain("worktree: /tmp/foo-worktree");
    // Line 3: heartbeat
    expect(output).toContain("last heartbeat: 2m ago");
  });

  test("summarizeAgentCounts breaks down into active/completed/dead", () => {
    const agents = [
      { status: "running" },
      { status: "running" },
      { status: "completed" },
      { status: "failed" },
      { status: "killed" },
    ] as any[];

    const counts = summarizeAgentCounts(agents);
    expect(counts.active).toBe(2);
    expect(counts.completed).toBe(1);
    expect(counts.dead).toBe(2);
    expect(counts.summary).toBe("2 active, 1 completed, 2 dead");
  });
});
