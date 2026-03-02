import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../src/db/index.js";
import { createRun } from "../src/db/queries/runs.js";
import { createAgent } from "../src/db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../src/db/queries/buildplans.js";
import { createContract, createBinding, createDependency } from "../src/db/queries/contracts.js";
import { createSpec } from "../src/db/queries/specs.js";
import type { SqliteDb } from "../src/db/index.js";
import type { Buildplan } from "../src/types/index.js";
import {
  gatherIntegrationTesterContext,
  gatherEvaluatorContext,
  gatherMergerContext,
} from "../src/pipeline/instruction-context.js";
import type {
  ModuleInfo,
  BuilderInfo,
  ContractInfo,
  ScenarioInfo,
  IntegrationTesterContext,
  EvaluatorContext,
  MergerContext,
} from "../src/pipeline/instruction-context.js";

// Helper to create a minimal buildplan JSON
function makeBuildplanJson(overrides?: Partial<Buildplan>): string {
  const plan: Buildplan = {
    spec_id: "test-spec",
    modules: [
      {
        id: "mod-a",
        title: "Module A",
        description: "First module",
        scope: { creates: ["src/a.ts"], modifies: [], test_files: ["tests/a.test.ts"] },
        estimated_complexity: "low",
        estimated_tokens: 1000,
        estimated_duration_min: 5,
      },
      {
        id: "mod-b",
        title: "Module B",
        description: "Second module",
        scope: { creates: ["src/b.ts"], modifies: ["src/shared.ts"], test_files: ["tests/b.test.ts"] },
        estimated_complexity: "medium",
        estimated_tokens: 2000,
        estimated_duration_min: 10,
      },
    ],
    contracts: [
      {
        name: "SharedContract",
        description: "Shared interface between A and B",
        format: "typescript",
        content: "export interface Shared { value: string; }",
        bound_modules: ["mod-a", "mod-b"],
        binding_roles: { "mod-a": "implementer", "mod-b": "consumer" },
      },
    ],
    dependencies: [
      { from: "mod-b", to: "mod-a", type: "completion" },
    ],
    parallelism: {
      max_concurrent: 2,
      parallel_groups: [
        { phase: 1, modules: ["mod-a"] },
        { phase: 2, modules: ["mod-b"] },
      ],
      critical_path: ["mod-a", "mod-b"],
      critical_path_estimated_min: 15,
    },
    integration_strategy: {
      checkpoints: [
        {
          after_phase: 1,
          test: "Verify module A exports Shared interface",
          modules_involved: ["mod-a"],
        },
      ],
      final_integration: "Run all tests and verify A and B compose correctly",
    },
    risks: [],
    total_estimated_tokens: 3000,
    total_estimated_cost_usd: 0.5,
    total_estimated_duration_min: 15,
    ...overrides,
  };
  return JSON.stringify(plan);
}

// Helper to set up a full test scenario with run, spec, buildplan, agents, contracts
function setupFullScenario(db: SqliteDb) {
  const spec = createSpec(db, "spec_test", "Test Spec", ".df/specs/spec_test.md");
  const run = createRun(db, { spec_id: spec.id });

  // Create architect agent (needed for buildplan)
  const architect = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "architect",
    name: "architect-test",
    system_prompt: "You are an architect.",
  });

  const planJson = makeBuildplanJson();
  const bp = createBuildplan(db, run.id, spec.id, architect.id, planJson);
  updateBuildplanStatus(db, bp.id, "active");

  // Create builder agents for each module
  const builderA = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "builder",
    name: "builder-mod-a",
    module_id: "mod-a",
    buildplan_id: bp.id,
    worktree_path: "/tmp/worktrees/mod-a",
    system_prompt: "Build module A.",
  });
  // Update builder A to completed status
  db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run(builderA.id);

  const builderB = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "builder",
    name: "builder-mod-b",
    module_id: "mod-b",
    buildplan_id: bp.id,
    worktree_path: "/tmp/worktrees/mod-b",
    system_prompt: "Build module B.",
  });
  db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run(builderB.id);

  // Create contract in DB
  const contract = createContract(
    db,
    run.id,
    bp.id,
    "SharedContract",
    "Shared interface between A and B",
    "typescript",
    "export interface Shared { value: string; }",
  );

  // Create bindings
  createBinding(db, contract.id, builderA.id, "mod-a", "implementer");
  createBinding(db, contract.id, builderB.id, "mod-b", "consumer");

  // Create dependencies
  createDependency(db, run.id, builderB.id, "mod-a", "completion", builderA.id);

  return { spec, run, architect, bp, builderA, builderB, contract };
}

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

// ============================================================
// gatherIntegrationTesterContext tests
// ============================================================
describe("gatherIntegrationTesterContext", () => {
  test("returns correct modules from buildplan", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.modules).toHaveLength(2);
    expect(ctx.modules[0].id).toBe("mod-a");
    expect(ctx.modules[0].title).toBe("Module A");
    expect(ctx.modules[0].description).toBe("First module");
    expect(ctx.modules[0].scope.creates).toEqual(["src/a.ts"]);
    expect(ctx.modules[1].id).toBe("mod-b");
  });

  test("returns correct builders with metadata", () => {
    const { run, builderA, builderB } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.builders).toHaveLength(2);

    const bA = ctx.builders.find((b) => b.moduleId === "mod-a");
    expect(bA).toBeDefined();
    expect(bA!.agentId).toBe(builderA.id);
    expect(bA!.worktreePath).toBe("/tmp/worktrees/mod-a");
    expect(bA!.status).toBe("completed");

    const bB = ctx.builders.find((b) => b.moduleId === "mod-b");
    expect(bB).toBeDefined();
    expect(bB!.agentId).toBe(builderB.id);
  });

  test("returns correct contracts", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.contracts).toHaveLength(1);
    expect(ctx.contracts[0].name).toBe("SharedContract");
    expect(ctx.contracts[0].content).toBe("export interface Shared { value: string; }");
    expect(ctx.contracts[0].format).toBe("typescript");
    expect(ctx.contracts[0].boundModules).toEqual(["mod-a", "mod-b"]);
  });

  test("returns dependency graph from buildplan", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.dependencyGraph).toHaveLength(1);
    expect(ctx.dependencyGraph[0]).toEqual({
      from: "mod-b",
      to: "mod-a",
      type: "completion",
    });
  });

  test("returns integration strategy from buildplan", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.integrationStrategy.checkpoints).toHaveLength(1);
    expect(ctx.integrationStrategy.checkpoints[0].after_phase).toBe(1);
    expect(ctx.integrationStrategy.checkpoints[0].test).toBe("Verify module A exports Shared interface");
    expect(ctx.integrationStrategy.final_integration).toBe("Run all tests and verify A and B compose correctly");
  });

  test("returns testCommand as 'bun test'", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.testCommand).toBe("bun test");
  });

  test("throws if run not found", () => {
    expect(() => gatherIntegrationTesterContext(db, "nonexistent")).toThrow("Run not found");
  });

  test("throws if no active buildplan", () => {
    const spec = createSpec(db, "spec_no_plan", "No Plan Spec", ".df/specs/spec_no_plan.md");
    const run = createRun(db, { spec_id: spec.id });
    expect(() => gatherIntegrationTesterContext(db, run.id)).toThrow("No active buildplan");
  });

  test("builders with no worktree_path use empty string", () => {
    const spec = createSpec(db, "spec_nowt", "No WT Spec", ".df/specs/spec_nowt.md");
    const run = createRun(db, { spec_id: spec.id });
    const architect = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "arch",
      system_prompt: "arch",
    });

    const planJson = makeBuildplanJson();
    const bp = createBuildplan(db, run.id, spec.id, architect.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    // Create builder with no worktree_path
    createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-no-wt",
      module_id: "mod-a",
      buildplan_id: bp.id,
      system_prompt: "build",
    });

    const ctx = gatherIntegrationTesterContext(db, run.id);
    const builder = ctx.builders.find((b) => b.moduleId === "mod-a");
    expect(builder).toBeDefined();
    expect(builder!.worktreePath).toBe("");
  });
});

// ============================================================
// gatherEvaluatorContext tests
// ============================================================
describe("gatherEvaluatorContext", () => {
  test("returns modules and builders from buildplan", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    expect(ctx.modules).toHaveLength(2);
    expect(ctx.builders).toHaveLength(2);
  });

  test("returns spec content from spec file path", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    // specContent will contain spec ID since we can't read the file in test
    // The function should gracefully handle missing spec files
    expect(typeof ctx.specContent).toBe("string");
  });

  test("returns scenarios from filesystem", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    // Scenarios are read from .df/scenarios/ directories
    // In test environment, these directories may not exist, so expect empty array
    expect(Array.isArray(ctx.scenarios)).toBe(true);
  });

  test("returns testCommand and runCommand", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    expect(ctx.testCommand).toBe("bun test");
    expect(typeof ctx.runCommand).toBe("string");
  });

  test("throws if run not found", () => {
    expect(() => gatherEvaluatorContext(db, "nonexistent")).toThrow("Run not found");
  });

  test("handles missing spec file gracefully", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    // Should not throw, but return a fallback message
    expect(ctx.specContent).toBeDefined();
    expect(typeof ctx.specContent).toBe("string");
  });
});

// ============================================================
// gatherMergerContext tests
// ============================================================
describe("gatherMergerContext", () => {
  test("returns builders in dependency order", () => {
    const { run, builderA, builderB } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");

    expect(ctx.builders).toHaveLength(2);
    // Dependency order: mod-a first (no deps), then mod-b (depends on mod-a)
    expect(ctx.builders[0].moduleId).toBe("mod-a");
    expect(ctx.builders[1].moduleId).toBe("mod-b");
  });

  test("returns dependency order as array of module IDs", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");

    expect(ctx.dependencyOrder).toEqual(["mod-a", "mod-b"]);
  });

  test("returns target branch", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");
    expect(ctx.targetBranch).toBe("main");
  });

  test("returns target branch with custom name", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "develop");
    expect(ctx.targetBranch).toBe("develop");
  });

  test("returns knownConflicts as empty array when none", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");

    expect(ctx.knownConflicts).toEqual([]);
  });

  test("returns postMergeValidation command", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");

    expect(typeof ctx.postMergeValidation).toBe("string");
    expect(ctx.postMergeValidation.length).toBeGreaterThan(0);
  });

  test("throws if run not found", () => {
    expect(() => gatherMergerContext(db, "nonexistent", "main")).toThrow("Run not found");
  });

  test("handles single module with no dependencies", () => {
    const spec = createSpec(db, "spec_single", "Single Module", ".df/specs/spec_single.md");
    const run = createRun(db, { spec_id: spec.id });
    const architect = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "arch-single",
      system_prompt: "arch",
    });

    const singlePlan = makeBuildplanJson({
      modules: [
        {
          id: "only-mod",
          title: "Only Module",
          description: "The only module",
          scope: { creates: ["src/only.ts"], modifies: [], test_files: ["tests/only.test.ts"] },
          estimated_complexity: "low",
          estimated_tokens: 500,
          estimated_duration_min: 3,
        },
      ],
      contracts: [],
      dependencies: [],
      parallelism: {
        max_concurrent: 1,
        parallel_groups: [{ phase: 1, modules: ["only-mod"] }],
        critical_path: ["only-mod"],
        critical_path_estimated_min: 3,
      },
    });
    const bp = createBuildplan(db, run.id, spec.id, architect.id, singlePlan);
    updateBuildplanStatus(db, bp.id, "active");

    const builder = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-only",
      module_id: "only-mod",
      buildplan_id: bp.id,
      worktree_path: "/tmp/worktrees/only",
      system_prompt: "build",
    });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run(builder.id);

    const ctx = gatherMergerContext(db, run.id, "main");
    expect(ctx.builders).toHaveLength(1);
    expect(ctx.dependencyOrder).toEqual(["only-mod"]);
  });
});

// ============================================================
// Type export tests
// ============================================================
describe("type exports", () => {
  test("ModuleInfo type has correct shape", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);
    const mod = ctx.modules[0];

    // Type checking — these properties must exist
    expect(mod.id).toBeDefined();
    expect(mod.title).toBeDefined();
    expect(mod.description).toBeDefined();
    expect(mod.scope).toBeDefined();
    expect(mod.scope.creates).toBeDefined();
    expect(mod.scope.modifies).toBeDefined();
    expect(mod.scope.test_files).toBeDefined();
  });

  test("BuilderInfo type has correct shape", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);
    const builder = ctx.builders[0];

    expect(builder.agentId).toBeDefined();
    expect(builder.moduleId).toBeDefined();
    expect(builder.worktreePath).toBeDefined();
    expect(builder.branchName).toBeDefined();
    expect(builder.filesChanged).toBeDefined();
    expect(builder.status).toBeDefined();
  });

  test("ContractInfo type has correct shape", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);
    const contract = ctx.contracts[0];

    expect(contract.name).toBeDefined();
    expect(contract.description).toBeDefined();
    expect(contract.format).toBeDefined();
    expect(contract.content).toBeDefined();
    expect(contract.boundModules).toBeDefined();
    expect(Array.isArray(contract.boundModules)).toBe(true);
  });

  test("IntegrationTesterContext has all required fields", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherIntegrationTesterContext(db, run.id);

    expect(ctx.modules).toBeDefined();
    expect(ctx.builders).toBeDefined();
    expect(ctx.contracts).toBeDefined();
    expect(ctx.dependencyGraph).toBeDefined();
    expect(ctx.integrationStrategy).toBeDefined();
    expect(ctx.integrationStrategy.checkpoints).toBeDefined();
    expect(ctx.integrationStrategy.final_integration).toBeDefined();
    expect(ctx.testCommand).toBeDefined();
  });

  test("EvaluatorContext has all required fields", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherEvaluatorContext(db, run.id);

    expect(ctx.scenarios).toBeDefined();
    expect(ctx.specContent).toBeDefined();
    expect(ctx.modules).toBeDefined();
    expect(ctx.builders).toBeDefined();
    expect(ctx.testCommand).toBeDefined();
    expect(ctx.runCommand).toBeDefined();
  });

  test("MergerContext has all required fields", () => {
    const { run } = setupFullScenario(db);
    const ctx = gatherMergerContext(db, run.id, "main");

    expect(ctx.builders).toBeDefined();
    expect(ctx.dependencyOrder).toBeDefined();
    expect(ctx.targetBranch).toBeDefined();
    expect(ctx.knownConflicts).toBeDefined();
    expect(ctx.postMergeValidation).toBeDefined();
  });
});
