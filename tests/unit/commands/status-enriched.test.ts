import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createAgent, updateAgentStatus, updateAgentPid } from "../../../src/db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { getRunWithSpecTitle, getModuleProgress } from "../../../src/db/queries/status-queries.js";
import { formatModuleProgressInline } from "../../../src/utils/format-module-progress.js";
import { summarizeAgentCounts } from "../../../src/utils/agent-enrichment.js";
import { formatStatusDetail } from "../../../src/utils/format-status-detail.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

function makeBuildplanJson(modules: Array<{ id: string; title: string }>) {
  return JSON.stringify({
    spec_id: "spec_1",
    modules: modules.map(m => ({
      id: m.id,
      title: m.title,
      description: `${m.title} module`,
      scope: { creates: [], modifies: [], test_files: [] },
      estimated_complexity: "medium",
      estimated_tokens: 5000,
      estimated_duration_min: 10,
    })),
    contracts: [],
    dependencies: [],
    parallelism: {
      max_concurrent: 4,
      parallel_groups: [{ phase: 1, modules: modules.map(m => m.id) }],
      critical_path: [modules[0]?.id ?? ""],
      critical_path_estimated_min: 10,
    },
    integration_strategy: {
      checkpoints: [],
      final_integration: "Run all tests",
    },
    risks: [],
    total_estimated_tokens: 10000,
    total_estimated_cost_usd: 2.0,
    total_estimated_duration_min: 20,
  });
}

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("status command enriched options", () => {
  test("statusCommand has --detail option", async () => {
    const { statusCommand } = await import("../../../src/commands/status.js");
    const opts = statusCommand.options.map((o: any) => o.long);
    expect(opts).toContain("--detail");
  });
});

describe("status enrichment data flow", () => {
  test("getRunWithSpecTitle includes spec title", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
    const result = getRunWithSpecTitle(db, runId);
    expect(result).not.toBeNull();
    expect(result!.spec_title).toBe("Enrich CLI output");
  });

  test("getModuleProgress returns per-module status from active buildplan", () => {
    const arch = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    const planJson = makeBuildplanJson([
      { id: "parser", title: "Parser" },
      { id: "lexer", title: "Lexer" },
      { id: "codegen", title: "Code Generator" },
    ]);
    const bp = createBuildplan(db, runId, "spec_1", arch.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    const b1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    updateAgentStatus(db, b1.id, "completed");

    const b2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });
    updateAgentPid(db, b2.id, 1234);

    // codegen has no builder yet

    const progress = getModuleProgress(db, runId);
    expect(progress).toHaveLength(3);

    const inline = formatModuleProgressInline(progress);
    expect(inline).toContain("parser(done)");
    expect(inline).toContain("lexer(building");
    expect(inline).toContain("codegen(pending)");
  });

  test("summarizeAgentCounts produces active/completed/dead breakdown", () => {
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentPid(db, a1.id, 1234);

    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    updateAgentStatus(db, a2.id, "completed");

    const a3 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b3", system_prompt: "p" });
    updateAgentStatus(db, a3.id, "failed");

    const agents = db.prepare("SELECT * FROM agents WHERE run_id = ?").all(runId) as any[];
    const counts = summarizeAgentCounts(agents);
    expect(counts.active).toBe(1);
    expect(counts.completed).toBe(1);
    expect(counts.dead).toBe(1);
    expect(counts.summary).toContain("1 active");
    expect(counts.summary).toContain("1 completed");
    expect(counts.summary).toContain("1 dead");
  });
});

describe("formatStatusDetail", () => {
  test("shows spec title in parentheses after spec ID", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run);
    expect(output).toContain("spec_1");
    expect(output).toContain("(Enrich CLI output)");
  });

  test("shows module progress inline", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
    const arch = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    const planJson = makeBuildplanJson([
      { id: "parser", title: "Parser" },
      { id: "lexer", title: "Lexer" },
    ]);
    const bp = createBuildplan(db, runId, "spec_1", arch.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    const b1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    updateAgentStatus(db, b1.id, "completed");

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run);
    expect(output).toContain("Modules:");
    expect(output).toContain("parser(done)");
    expect(output).toContain("lexer(pending)");
  });

  test("shows agent breakdown as active/completed/dead", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    updateAgentPid(db, a1.id, 1234);
    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    updateAgentStatus(db, a2.id, "completed");

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run);
    expect(output).toContain("Agents:");
    expect(output).toContain("1 active");
    expect(output).toContain("1 completed");
  });

  test("shows cost breakdown by role in --detail mode", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
    const a1 = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    db.prepare("UPDATE agents SET cost_usd = 0.45 WHERE id = ?").run(a1.id);
    const a2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" });
    db.prepare("UPDATE agents SET cost_usd = 1.20 WHERE id = ?").run(a2.id);
    const a3 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b2", system_prompt: "p" });
    db.prepare("UPDATE agents SET cost_usd = 0.90 WHERE id = ?").run(a3.id);

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run, { detail: true });
    expect(output).toContain("Cost by role:");
    expect(output).toContain("architect: $0.45");
    expect(output).toContain("builder: $2.10");
  });

  test("omits spec title parentheses when spec_title is null", () => {
    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run);
    expect(output).toContain("spec_1");
    expect(output).not.toContain("(null)");
    expect(output).not.toContain("()");
  });
});
