import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { PipelineEngine } from "../../../src/pipeline/engine.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { DfConfig } from "../../../src/types/config.js";
import type { ResumeOptions } from "../../../src/pipeline/resume.js";

function createMockRuntime(): AgentRuntime {
  return {
    spawn: mock(async () => ({ id: "test-agent", pid: 12345, role: "builder" as const, kill: async () => {} })),
    status: mock(async () => "stopped" as const),
    listActive: mock(async () => []),
    kill: mock(async () => {}),
    send: mock(async () => {}),
  };
}

function createTestConfig(): DfConfig {
  return {
    project: {
      name: "test-project",
      branch: "main",
    },
    build: {
      default_mode: "thorough" as const,
      max_parallel: 4,
      budget_usd: 50.0,
      max_iterations: 3,
    },
    runtime: {
      adapter: "claude-code" as const,
      heartbeat_timeout_ms: 300_000,
    },
    thresholds: {
      satisfaction: 0.8,
      changeability: 0.6,
    },
  };
}

describe("PipelineEngine.resume", () => {
  let db: SqliteDb;
  let runtime: AgentRuntime;
  let config: DfConfig;

  beforeEach(() => {
    db = getDbForTest();
    runtime = createMockRuntime();
    config = createTestConfig();
  });

  test("resume method exists on PipelineEngine", () => {
    const engine = new PipelineEngine(db, runtime, config);
    expect(typeof engine.resume).toBe("function");
  });

  test("throws if run does not exist", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    await expect(engine.resume({ runId: "non-existent-run" })).rejects.toThrow();
  });

  test("throws if run is not resumable (completed)", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "completed");

    await expect(engine.resume({ runId: run.id })).rejects.toThrow(/not resumable/i);
  });

  test("throws if run is not resumable (cancelled)", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "cancelled");

    await expect(engine.resume({ runId: run.id })).rejects.toThrow(/not resumable/i);
  });

  test("throws if run is currently running with active agents", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "running");

    // Create an active agent
    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-test",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "running");

    // Mock runtime to report agent as active
    (runtime.status as ReturnType<typeof mock>).mockImplementation(async () => "running");

    await expect(engine.resume({ runId: run.id })).rejects.toThrow(/active agents/i);
  });

  test("emits run-resumed event and sets status to running", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed", "some error");

    // Complete all phases except merge — so resume has one phase to process
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    // Create spec
    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Mock: the merge agent completes shortly after spawn (after updateAgentPid resets to "running")
    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string }) => {
      setTimeout(() => updateAgentStatus(db, cfg.agent_id, "completed"), 50);
      return { id: cfg.agent_id, pid: 99999, role: "merger" as const, kill: async () => {} };
    });

    await engine.resume({ runId: run.id });

    // Check run-resumed event was emitted
    const events = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'run-resumed'"
    ).all(run.id) as { type: string; data: string }[];
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("run-resumed");

    // Check the data contains the resume phase
    const data = JSON.parse(events[0].data);
    expect(data.fromPhase).toBe("merge");
  }, 15000);

  test("returns run ID on success", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed");

    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Complete all phases except merge
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    // Mock: the merge agent completes shortly after spawn (after updateAgentPid resets to "running")
    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string }) => {
      setTimeout(() => updateAgentStatus(db, cfg.agent_id, "completed"), 50);
      return { id: cfg.agent_id, pid: 99999, role: "merger" as const, kill: async () => {} };
    });

    const resultId = await engine.resume({ runId: run.id });
    expect(resultId).toBe(run.id);

    // Run should be completed
    const updatedRun = getRun(db, run.id);
    expect(updatedRun!.status).toBe("completed");
  }, 15000);

  test("respects fromPhase override", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed");

    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Complete all phases (normally getResumePoint would throw)
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change", "merge"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    // With fromPhase override to "merge", it should resume from merge regardless
    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string }) => {
      updateAgentStatus(db, cfg.agent_id, "completed");
      return { id: cfg.agent_id, pid: 99999, role: "merger" as const, kill: async () => {} };
    });

    const resultId = await engine.resume({ runId: run.id, fromPhase: "merge" });
    expect(resultId).toBe(run.id);

    // Verify it actually ran the merge phase
    const phaseStartEvents = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'phase-started'"
    ).all(run.id) as { data: string }[];

    const mergeEvents = phaseStartEvents.filter((e) => {
      const d = JSON.parse(e.data);
      return d.phase === "merge";
    });
    expect(mergeEvents.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  test("respects budgetUsd override", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed");

    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Complete all phases except merge
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string }) => {
      updateAgentStatus(db, cfg.agent_id, "completed");
      return { id: cfg.agent_id, pid: 99999, role: "merger" as const, kill: async () => {} };
    });

    await engine.resume({ runId: run.id, budgetUsd: 100.0 });

    // Budget should be updated on the run
    const updatedRun = getRun(db, run.id);
    expect(updatedRun!.budget_usd).toBe(100.0);
  }, 15000);

  test("pre-populates completedModules for build phase", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed");

    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Complete scout, architect, plan-review phases
    for (const phase of ["scout", "architect", "plan-review"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    // Create a completed builder from previous attempt
    const completedBuilder = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, completedBuilder.id, "completed");

    // Need a valid architect agent for FK constraint
    const architectAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "architect-test",
      system_prompt: "test",
    });

    const bpId = "bp-test-001";
    db.prepare(
      `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel)
       VALUES (?, ?, ?, ?, 1, 'active', ?, 2, 0, 4)`
    ).run(
      bpId,
      run.id,
      "test-spec",
      architectAgent.id,
      JSON.stringify({
        modules: [
          { id: "mod-a", title: "Module A", description: "First module", scope: { creates: [], modifies: [] }, estimated_complexity: "low", estimated_tokens: 1000, estimated_duration_min: 5 },
          { id: "mod-b", title: "Module B", description: "Second module", scope: { creates: [], modifies: [] }, estimated_complexity: "low", estimated_tokens: 1000, estimated_duration_min: 5 },
        ],
        contracts: [],
        dependencies: [],
      }),
    );

    // Track spawn calls to verify only mod-b is spawned
    const spawnedModules: string[] = [];
    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string; module_id?: string }) => {
      if (cfg.module_id) spawnedModules.push(cfg.module_id);
      setTimeout(() => updateAgentStatus(db, cfg.agent_id, "completed"), 50);
      return { id: cfg.agent_id, pid: 99999, role: "builder" as const, kill: async () => {} };
    });

    try {
      await engine.resume({ runId: run.id });
    } catch {
      // May fail at later phases (integrate, evaluate), that's fine
    }

    // Only mod-b should have been spawned (mod-a was already completed)
    expect(spawnedModules).toContain("mod-b");
    expect(spawnedModules).not.toContain("mod-a");

    // Check database: mod-a should have only 1 builder (the original, not re-spawned)
    const modABuilders = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' AND module_id = 'mod-a'"
    ).all(run.id) as { module_id: string }[];
    expect(modABuilders.length).toBe(1);
  }, 30000);

  test("allows resuming stale running run with no live agents", async () => {
    const engine = new PipelineEngine(db, runtime, config);
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "running");

    db.prepare(
      "INSERT INTO specs (id, title, status, file_path, content_hash) VALUES (?, ?, ?, ?, ?)"
    ).run("test-spec", "Test Spec", "active", "/tmp/test-spec.md", "abc123");

    // Create a previously running agent that's now dead
    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-stale",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "running");

    // Runtime reports it as stopped (stale)
    (runtime.status as ReturnType<typeof mock>).mockImplementation(async () => "stopped");

    // Complete all phases except merge
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change"]) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    // Mock merge agent
    (runtime.spawn as ReturnType<typeof mock>).mockImplementation(async (cfg: { agent_id: string }) => {
      setTimeout(() => updateAgentStatus(db, cfg.agent_id, "completed"), 50);
      return { id: cfg.agent_id, pid: 99999, role: "merger" as const, kill: async () => {} };
    });

    // Should NOT throw — stale running run with dead agents is resumable
    const resultId = await engine.resume({ runId: run.id });
    expect(resultId).toBe(run.id);
  }, 15000);
});
