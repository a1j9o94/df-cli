import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createAgent, updateAgentStatus, updateAgentPid } from "../../../src/db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { getRunWithSpecTitle } from "../../../src/db/queries/status-queries.js";
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
  createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");
});

describe("status --detail expanded view", () => {
  test("shows phase timeline with elapsed times", () => {
    // Create phase events
    const scoutStart = new Date(Date.now() - 600000).toISOString(); // 10m ago
    const scoutEnd = new Date(Date.now() - 480000).toISOString(); // 8m ago (2m duration)
    const archStart = new Date(Date.now() - 480000).toISOString();
    const archEnd = new Date(Date.now() - 300000).toISOString(); // 5m ago (3m duration)
    const buildStart = new Date(Date.now() - 300000).toISOString();

    createEvent(db, runId, "phase-started", { phase: "scout" });
    // Manually set the created_at for these events
    db.prepare("UPDATE events SET created_at = ? WHERE run_id = ? AND type = 'phase-started'").run(scoutStart, runId);

    createEvent(db, runId, "phase-completed", { phase: "scout" });
    db.prepare(`UPDATE events SET created_at = ? WHERE run_id = ? AND type = 'phase-completed' AND data LIKE '%scout%'`).run(scoutEnd, runId);

    createEvent(db, runId, "phase-started", { phase: "architect" });
    db.prepare(`UPDATE events SET created_at = ? WHERE run_id = ? AND type = 'phase-started' AND data LIKE '%architect%'`).run(archStart, runId);

    createEvent(db, runId, "phase-completed", { phase: "architect" });
    db.prepare(`UPDATE events SET created_at = ? WHERE run_id = ? AND type = 'phase-completed' AND data LIKE '%architect%'`).run(archEnd, runId);

    createEvent(db, runId, "phase-started", { phase: "build" });
    db.prepare(`UPDATE events SET created_at = ? WHERE run_id = ? AND type = 'phase-started' AND data LIKE '%build%'`).run(buildStart, runId);

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run, { detail: true });

    expect(output).toContain("Phase timeline:");
    expect(output).toContain("scout:");
    expect(output).toContain("architect:");
    expect(output).toContain("build:");
  });

  test("shows module grid with status, builder, elapsed, cost", () => {
    const arch = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    const planJson = makeBuildplanJson([
      { id: "parser", title: "Parser" },
      { id: "lexer", title: "Lexer" },
    ]);
    const bp = createBuildplan(db, runId, "spec_1", arch.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    const b1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    updateAgentStatus(db, b1.id, "completed");
    db.prepare("UPDATE agents SET cost_usd = 0.50, total_active_ms = 120000 WHERE id = ?").run(b1.id);

    const b2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });
    updateAgentPid(db, b2.id, 1234);
    db.prepare("UPDATE agents SET cost_usd = 0.20 WHERE id = ?").run(b2.id);

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run, { detail: true });

    expect(output).toContain("Module details:");
    expect(output).toContain("parser");
    expect(output).toContain("lexer");
    expect(output).toContain("b-parser");
    expect(output).toContain("b-lexer");
  });

  test("shows 'Not yet evaluated' when no evaluation results", () => {
    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run, { detail: true });
    expect(output).toContain("Not yet evaluated");
  });

  test("shows evaluation results when past evaluate phase", () => {
    // Create evaluation events
    createEvent(db, runId, "evaluation-passed", {
      mode: "functional",
      score: 0.95,
      passed: 19,
      failed: 1,
      total: 20,
    });

    const run = getRunWithSpecTitle(db, runId)!;
    const output = formatStatusDetail(db, run, { detail: true });
    expect(output).toContain("Evaluation:");
  });
});
