import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createSpec } from "../../../../src/db/queries/specs.js";
import {
  createAgent, updateAgentStatus, updateAgentPid,
} from "../../../../src/db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../../../../src/db/queries/buildplans.js";
import {
  getModuleProgress, getRunWithSpecTitle,
} from "../../../../src/db/queries/status-queries.js";
import type { SqliteDb } from "../../../../src/db/index.js";

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

describe("getModuleProgress", () => {
  test("returns empty array when no active buildplan", () => {
    const progress = getModuleProgress(db, runId);
    expect(progress).toEqual([]);
  });

  test("returns module status from active buildplan", () => {
    const arch = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    const planJson = makeBuildplanJson([
      { id: "parser", title: "Parser" },
      { id: "lexer", title: "Lexer" },
    ]);
    const bp = createBuildplan(db, runId, "spec_1", arch.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    // Create builder agents for each module
    const b1 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });
    updateAgentPid(db, b1.id, 1234);
    // b-parser is "running"

    const b2 = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });
    updateAgentStatus(db, b2.id, "completed");

    const progress = getModuleProgress(db, runId);
    expect(progress).toHaveLength(2);

    const parserModule = progress.find(p => p.moduleId === "parser");
    expect(parserModule).toBeDefined();
    expect(parserModule!.moduleTitle).toBe("Parser");
    expect(parserModule!.status).toBe("running");
    expect(parserModule!.agentName).toBe("b-parser");

    const lexerModule = progress.find(p => p.moduleId === "lexer");
    expect(lexerModule).toBeDefined();
    expect(lexerModule!.status).toBe("completed");
  });

  test("returns 'pending' for modules with no builder assigned", () => {
    const arch = createAgent(db, { agent_id: "", run_id: runId, role: "architect", name: "arch", system_prompt: "p" });
    const planJson = makeBuildplanJson([
      { id: "parser", title: "Parser" },
      { id: "codegen", title: "Code Generator" },
    ]);
    const bp = createBuildplan(db, runId, "spec_1", arch.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    // Only assign a builder for parser
    createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b-parser", module_id: "parser", system_prompt: "p" });

    const progress = getModuleProgress(db, runId);
    expect(progress).toHaveLength(2);

    const codegenModule = progress.find(p => p.moduleId === "codegen");
    expect(codegenModule!.status).toBe("pending");
    expect(codegenModule!.agentName).toBeNull();
  });
});

describe("getRunWithSpecTitle", () => {
  test("returns null for non-existent run", () => {
    expect(getRunWithSpecTitle(db, "nonexistent")).toBeNull();
  });

  test("returns run with spec_title when spec exists", () => {
    createSpec(db, "spec_1", "Enrich CLI output", ".df/specs/spec_1.md");

    const result = getRunWithSpecTitle(db, runId);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(runId);
    expect(result!.spec_title).toBe("Enrich CLI output");
  });

  test("returns run with null spec_title when spec not in DB", () => {
    // spec_1 is referenced but not in the specs table
    const result = getRunWithSpecTitle(db, runId);
    expect(result).not.toBeNull();
    expect(result!.spec_title).toBeNull();
  });
});
