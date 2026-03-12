import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { createEvent, listEvents } from "../../../src/db/queries/events.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { PipelineEngine } from "../../../src/pipeline/engine.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";

function makePlan(moduleCount: number): string {
  const modules = Array.from({ length: moduleCount }, (_, i) => ({
    id: `m${i + 1}`,
    title: `Module ${i + 1}`,
    description: "test",
    scope: { creates: [], modifies: [], test_files: [] },
    estimated_complexity: "low",
    estimated_tokens: 1000,
    estimated_duration_min: 5,
  }));

  return JSON.stringify({
    spec_id: "s1",
    modules,
    contracts: [],
    dependencies: [],
    parallelism: {
      max_concurrent: 1,
      parallel_groups: [{ phase: 1, modules: modules.map((m) => m.id) }],
      critical_path: [modules[0].id],
      critical_path_estimated_min: 5,
    },
    integration_strategy: { checkpoints: [], final_integration: "test" },
    risks: [],
    total_estimated_tokens: 1000 * moduleCount,
    total_estimated_cost_usd: 0.5 * moduleCount,
    total_estimated_duration_min: 5 * moduleCount,
  });
}

function mockRuntime(): AgentRuntime {
  return {
    spawn: async () => ({ id: "agent_mock", pid: 1 }),
    send: async () => {},
    kill: async () => {},
    status: async () => "stopped" as const,
    listActive: async () => [],
  };
}

function setupWithBuildplan(db: SqliteDb, moduleCount: number) {
  const specId = "s1";
  createSpec(db, specId, "Test Spec", "/tmp/test.md");

  const run = createRun(db, { spec_id: specId, budget_usd: 50 });
  updateRunStatus(db, run.id, "running");

  const arch = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "architect",
    name: "arch-1",
    system_prompt: "p",
  });

  const planJson = makePlan(moduleCount);
  const bp = createBuildplan(db, run.id, specId, arch.id, planJson);
  updateBuildplanStatus(db, bp.id, "active");

  return { run: getRun(db, run.id)!, bp, specId };
}

describe("Plan-review gate", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("auto-approves when module count <= 4", async () => {
    const { run } = setupWithBuildplan(db, 3);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    // Call executePhase directly via type escape
    await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });

    // Run should still be running (not paused)
    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("running");
  });

  test("auto-approves when module count is exactly 4", async () => {
    const { run } = setupWithBuildplan(db, 4);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("running");
  });

  test("pauses run when module count > 4", async () => {
    const { run } = setupWithBuildplan(db, 5);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    // Should throw PlanReviewPauseError
    await expect(
      (engine as any).executePhase(run.id, "plan-review", { module_count: 0 }),
    ).rejects.toThrow("Plan review: paused for human approval");

    // Run should now be paused
    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("paused");
  });

  test("emits plan-review-requested event when pausing", async () => {
    const { run } = setupWithBuildplan(db, 6);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    try {
      await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });
    } catch {
      // Expected PlanReviewPauseError
    }

    const events = listEvents(db, run.id, { type: "plan-review-requested" as any });
    expect(events.length).toBe(1);

    const data = JSON.parse(events[0].data!);
    expect(data.module_count).toBe(6);
    expect(data.buildplan_id).toBeDefined();
  });

  test("emits run-paused event with plan_review reason", async () => {
    const { run } = setupWithBuildplan(db, 7);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    try {
      await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });
    } catch {
      // Expected PlanReviewPauseError
    }

    const events = listEvents(db, run.id, { type: "run-paused" as any });
    expect(events.length).toBe(1);

    const data = JSON.parse(events[0].data!);
    expect(data.reason).toBe("plan_review");
  });

  test("auto-approves with 1 module", async () => {
    const { run } = setupWithBuildplan(db, 1);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("running");
  });

  test("paused run is not marked as failed", async () => {
    const { run } = setupWithBuildplan(db, 8);
    const engine = new PipelineEngine(db, mockRuntime(), DEFAULT_CONFIG);

    try {
      await (engine as any).executePhase(run.id, "plan-review", { module_count: 0 });
    } catch {
      // Expected PlanReviewPauseError
    }

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("paused");
    expect(updated.error).toBeNull();
  });
});
