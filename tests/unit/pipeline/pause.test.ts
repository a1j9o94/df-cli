import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createRun, getRun, updateRunStatus } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, listAgents } from "../../../src/db/queries/agents.js";
import { createEvent, listEvents } from "../../../src/db/queries/events.js";
import {
  pauseRun,
  resumePausedRun,
  checkBudgetThresholds,
  type PauseResult,
  type BudgetThresholdResult,
  BUDGET_WARNING_THRESHOLD,
} from "../../../src/pipeline/pause.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function setupRunWithAgents(db: InstanceType<typeof Database>, opts?: { budgetUsd?: number; costUsd?: number }) {
  const specId = "spec_test";
  db.prepare(
    "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
  ).run(specId, "Test Spec", "building", "/tmp/test.md");

  const run = createRun(db, {
    spec_id: specId,
    budget_usd: opts?.budgetUsd ?? 15.0,
  });
  updateRunStatus(db, run.id, "running");

  if (opts?.costUsd !== undefined) {
    db.prepare("UPDATE runs SET cost_usd = ? WHERE id = ?").run(opts.costUsd, run.id);
  }

  // Create a couple of running agents
  const agent1 = createAgent(db, {
    run_id: run.id,
    role: "builder",
    name: "builder-1",
    system_prompt: "test",
    module_id: "mod-a",
    worktree_path: "/tmp/worktree-a",
  });
  db.prepare("UPDATE agents SET status = 'running', pid = 1234 WHERE id = ?").run(agent1.id);

  const agent2 = createAgent(db, {
    run_id: run.id,
    role: "builder",
    name: "builder-2",
    system_prompt: "test",
    module_id: "mod-b",
    worktree_path: "/tmp/worktree-b",
  });
  db.prepare("UPDATE agents SET status = 'running', pid = 5678 WHERE id = ?").run(agent2.id);

  return { run: getRun(db, run.id)!, agents: [getAgent(db, agent1.id)!, getAgent(db, agent2.id)!] };
}

// Mock runtime that tracks signal calls
function createMockRuntime() {
  const signals: Array<{ agentId: string; action: string }> = [];
  return {
    signals,
    runtime: {
      spawn: async () => ({ id: "test", pid: 0 }),
      send: async () => {},
      kill: async (agentId: string) => { signals.push({ agentId, action: "kill" }); },
      status: async () => "running" as const,
      listActive: async () => [],
      suspend: async (agentId: string) => { signals.push({ agentId, action: "suspend" }); },
    },
  };
}

describe("pauseRun", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("pauses a running run and sets status to paused", async () => {
    const { run } = setupRunWithAgents(db);
    const mock = createMockRuntime();

    const result = await pauseRun(db, mock.runtime, run.id, "budget_exceeded");

    expect(result.success).toBe(true);

    const updatedRun = getRun(db, run.id);
    expect(updatedRun!.status).toBe("paused");
  });

  test("records pause reason and timestamp in event", async () => {
    const { run } = setupRunWithAgents(db);
    const mock = createMockRuntime();

    await pauseRun(db, mock.runtime, run.id, "budget_exceeded");

    const events = listEvents(db, run.id, { type: "run-paused" });
    expect(events.length).toBeGreaterThanOrEqual(1);

    const data = JSON.parse(events[0].data!);
    expect(data.reason).toBe("budget_exceeded");
    expect(data.paused_at).toBeDefined();
  });

  test("records agent positions (phase, module, status) in pause state", async () => {
    const { run } = setupRunWithAgents(db);
    const mock = createMockRuntime();

    const result = await pauseRun(db, mock.runtime, run.id, "manual");

    expect(result.agentStates).toBeDefined();
    expect(result.agentStates!.length).toBe(2);
    expect(result.agentStates![0].module_id).toBeDefined();
  });

  test("does NOT clean up worktrees on pause", async () => {
    const { run, agents } = setupRunWithAgents(db);
    const mock = createMockRuntime();

    await pauseRun(db, mock.runtime, run.id, "budget_exceeded");

    // Agents should still have their worktree paths
    for (const agent of agents) {
      const updated = getAgent(db, agent.id);
      expect(updated!.worktree_path).toBeTruthy();
    }
  });

  test("rejects pause on already paused run", async () => {
    const { run } = setupRunWithAgents(db);
    const mock = createMockRuntime();

    await pauseRun(db, mock.runtime, run.id, "manual");

    const result = await pauseRun(db, mock.runtime, run.id, "manual");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already paused");
  });

  test("rejects pause on completed run", async () => {
    const { run } = setupRunWithAgents(db);
    updateRunStatus(db, run.id, "completed");
    const mock = createMockRuntime();

    const result = await pauseRun(db, mock.runtime, run.id, "manual");
    expect(result.success).toBe(false);
  });

  test("rejects pause on non-existent run", async () => {
    const mock = createMockRuntime();
    const result = await pauseRun(db, mock.runtime, "run_nonexistent", "manual");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});

describe("checkBudgetThresholds", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("returns no action when under 80% budget", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 10.0 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("none");
    expect(result.warningEmitted).toBe(false);
    expect(result.shouldPause).toBe(false);
  });

  test("returns warning when at 80% budget", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 10.0, costUsd: 8.0 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("warning");
    expect(result.warningEmitted).toBe(true);
    expect(result.shouldPause).toBe(false);
    expect(result.percentUsed).toBeCloseTo(80);
  });

  test("returns pause when at 100% budget", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 15.0 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("pause");
    expect(result.shouldPause).toBe(true);
  });

  test("returns pause when over 100% budget", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 15.50 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("pause");
    expect(result.shouldPause).toBe(true);
  });

  test("returns no action when no budget is set (budget = 0)", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 0, costUsd: 100 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("none");
  });

  test("warning is emitted only once per threshold crossing", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 10.0, costUsd: 8.5 });

    // First check - should warn
    const result1 = checkBudgetThresholds(db, run.id);
    expect(result1.action).toBe("warning");

    // Record that warning was emitted
    createEvent(db, run.id, "budget-warning", { threshold: BUDGET_WARNING_THRESHOLD });

    // Second check - should not warn again
    const result2 = checkBudgetThresholds(db, run.id);
    expect(result2.action).toBe("none");
    expect(result2.warningEmitted).toBe(false);
  });

  test("BUDGET_WARNING_THRESHOLD is 0.8 (80%)", () => {
    expect(BUDGET_WARNING_THRESHOLD).toBe(0.8);
  });
});

describe("resumePausedRun", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("validates new budget exceeds current spend", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 14.87 });
    updateRunStatus(db, run.id, "paused");

    const result = resumePausedRun(db, run.id, 14.0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("must exceed current spend");
    expect(result.error).toContain("$14.87");
  });

  test("rejects resume of non-paused run", () => {
    const { run } = setupRunWithAgents(db);

    const result = resumePausedRun(db, run.id, 25.0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not paused");
  });

  test("sets run status back to running with new budget", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 14.87 });
    updateRunStatus(db, run.id, "paused");

    const result = resumePausedRun(db, run.id, 25.0);
    expect(result.success).toBe(true);

    const updatedRun = getRun(db, run.id);
    expect(updatedRun!.status).toBe("running");
    expect(updatedRun!.budget_usd).toBe(25.0);
  });

  test("emits run-resumed event", () => {
    const { run } = setupRunWithAgents(db, { budgetUsd: 15.0, costUsd: 14.87 });
    updateRunStatus(db, run.id, "paused");

    resumePausedRun(db, run.id, 25.0);

    const events = listEvents(db, run.id, { type: "run-resumed" });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const data = JSON.parse(events[0].data!);
    expect(data.previous_budget).toBe(15.0);
    expect(data.new_budget).toBe(25.0);
  });
});
