import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { validatePauseRun } from "../../../src/commands/pause.js";
import { validateContinueRun, validateBudgetForPausedRun } from "../../../src/commands/continue.js";
import { getResumableRuns } from "../../../src/pipeline/resume.js";

describe("pause → resume flow", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("full lifecycle: running → pause → resume → running", () => {
    // 1. Create a running run
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    // 2. Validate it can be paused
    const pauseValidation = validatePauseRun(db, run.id);
    expect(pauseValidation.valid).toBe(true);

    // 3. Pause it (simulate what dark pause does)
    updateRunStatus(db, run.id, "paused", "manual");
    createEvent(db, run.id, "run-paused", { reason: "manual" });

    // 4. Verify it appears as resumable
    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(1);
    expect(resumable[0].status).toBe("paused");

    // 5. Validate it can be resumed
    const resumeValidation = validateContinueRun(db, run.id);
    expect(resumeValidation.valid).toBe(true);

    // 6. Resume it (simulate what dark continue does)
    updateRunStatus(db, run.id, "running");
    createEvent(db, run.id, "run-resumed", { fromPhase: "build" });

    // 7. Verify final state
    const finalRun = getRun(db, run.id);
    expect(finalRun?.status).toBe("running");
  });

  test("budget pause → resume with new budget", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    // Simulate budget exceeded
    db.prepare("UPDATE runs SET cost_usd = 14.87 WHERE id = ?").run(run.id);
    updateRunStatus(db, run.id, "paused", "budget_exceeded");
    createEvent(db, run.id, "run-paused", { reason: "budget_exceeded", cost: 14.87, budget: 15 });

    // Verify budget validation
    const badBudget = validateBudgetForPausedRun(db, run.id, 14);
    expect(badBudget.valid).toBe(false);

    const equalBudget = validateBudgetForPausedRun(db, run.id, 14.87);
    expect(equalBudget.valid).toBe(false);

    const goodBudget = validateBudgetForPausedRun(db, run.id, 25);
    expect(goodBudget.valid).toBe(true);

    // Resume with new budget
    db.prepare("UPDATE runs SET budget_usd = 25 WHERE id = ?").run(run.id);
    updateRunStatus(db, run.id, "running");

    const finalRun = getRun(db, run.id);
    expect(finalRun?.budget_usd).toBe(25);
    expect(finalRun?.cost_usd).toBe(14.87);
    expect(finalRun?.status).toBe("running");
  });

  test("paused run preserves agent state", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    // Create some agents with state
    const builder1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      worktree_path: "/tmp/worktree-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, builder1.id, "completed");

    const builder2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      worktree_path: "/tmp/worktree-b",
      system_prompt: "test",
    });
    updateAgentStatus(db, builder2.id, "running");

    // Pause the run
    updateRunStatus(db, run.id, "paused", "budget_exceeded");

    // Verify agents are still intact (not cleaned up)
    const agents = db.prepare("SELECT * FROM agents WHERE run_id = ?").all(run.id) as any[];
    expect(agents.length).toBe(2);

    // Completed builder's worktree should still exist
    const completedBuilder = agents.find((a: any) => a.module_id === "mod-a");
    expect(completedBuilder.worktree_path).toBe("/tmp/worktree-a");
    expect(completedBuilder.status).toBe("completed");

    // Running builder's worktree should still exist
    const runningBuilder = agents.find((a: any) => a.module_id === "mod-b");
    expect(runningBuilder.worktree_path).toBe("/tmp/worktree-b");
  });

  test("cannot pause an already paused run", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "paused");

    const validation = validatePauseRun(db, run.id);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("already paused");
  });

  test("paused run has correct events recorded", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "running");

    // Pause
    updateRunStatus(db, run.id, "paused", "budget_exceeded");
    createEvent(db, run.id, "run-paused", { reason: "budget_exceeded" });

    // Resume
    updateRunStatus(db, run.id, "running");
    createEvent(db, run.id, "run-resumed", { fromPhase: "build" });

    // Check events
    const events = db.prepare(
      "SELECT type, data FROM events WHERE run_id = ? ORDER BY created_at"
    ).all(run.id) as any[];

    const pauseEvent = events.find((e: any) => e.type === "run-paused");
    expect(pauseEvent).toBeDefined();
    expect(JSON.parse(pauseEvent.data).reason).toBe("budget_exceeded");

    const resumeEvent = events.find((e: any) => e.type === "run-resumed");
    expect(resumeEvent).toBeDefined();
    expect(JSON.parse(resumeEvent.data).fromPhase).toBe("build");
  });
});
