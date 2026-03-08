import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createRun, getRun, updateRunStatus } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { listEvents } from "../../../src/db/queries/events.js";
import { pauseRun, resumePausedRun } from "../../../src/pipeline/pause.js";
import { getResumableRuns } from "../../../src/pipeline/resume.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function setupRunning(db: InstanceType<typeof Database>, opts?: { costUsd?: number; budgetUsd?: number }) {
  const specId = "spec_test";
  db.prepare(
    "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
  ).run(specId, "Test Spec", "building", "/tmp/test.md");

  const run = createRun(db, { spec_id: specId, budget_usd: opts?.budgetUsd ?? 50 });
  updateRunStatus(db, run.id, "running");

  if (opts?.costUsd !== undefined) {
    db.prepare("UPDATE runs SET cost_usd = ? WHERE id = ?").run(opts.costUsd, run.id);
  }

  createAgent(db, {
    run_id: run.id,
    role: "builder",
    name: "builder-1",
    system_prompt: "test",
    module_id: "mod-a",
    worktree_path: "/tmp/wt-a",
  });

  return getRun(db, run.id)!;
}

const mockRuntime = {
  spawn: async () => ({ id: "test", pid: 0 }),
  send: async () => {},
  kill: async () => {},
  status: async () => "running" as const,
  listActive: async () => [],
};

describe("Manual pause workflow", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("manual pause sets reason to 'manual'", async () => {
    const run = setupRunning(db);

    const result = await pauseRun(db, mockRuntime, run.id, "manual");
    expect(result.success).toBe(true);

    const events = listEvents(db, run.id, { type: "run-paused" as any });
    expect(events.length).toBe(1);
    const data = JSON.parse(events[0].data!);
    expect(data.reason).toBe("manual");
  });

  test("paused run appears in getResumableRuns", () => {
    const run = setupRunning(db);
    updateRunStatus(db, run.id, "paused");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(1);
    expect(resumable[0].status).toBe("paused");
  });

  test("full pause-resume cycle preserves run data", async () => {
    const run = setupRunning(db, { costUsd: 10, budgetUsd: 15 });

    // Pause
    const pauseResult = await pauseRun(db, mockRuntime, run.id, "manual");
    expect(pauseResult.success).toBe(true);

    const paused = getRun(db, run.id)!;
    expect(paused.status).toBe("paused");
    expect(paused.cost_usd).toBe(10);

    // Resume with new budget
    const resumeResult = resumePausedRun(db, run.id, 25);
    expect(resumeResult.success).toBe(true);

    const resumed = getRun(db, run.id)!;
    expect(resumed.status).toBe("running");
    expect(resumed.budget_usd).toBe(25);
    expect(resumed.cost_usd).toBe(10); // Cost preserved
  });

  test("pause then resume with insufficient budget is rejected", async () => {
    const run = setupRunning(db, { costUsd: 14.87, budgetUsd: 15 });

    await pauseRun(db, mockRuntime, run.id, "budget_exceeded");

    const result = resumePausedRun(db, run.id, 14);
    expect(result.success).toBe(false);
    expect(result.error).toContain("must exceed current spend");
    expect(result.error).toContain("$14.87");
  });

  test("paused runs are distinct from failed runs in status", async () => {
    const run1 = setupRunning(db, { costUsd: 5, budgetUsd: 50 });
    await pauseRun(db, mockRuntime, run1.id, "manual");

    // Create a failed run
    const specId2 = "spec_test2";
    db.prepare(
      "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
    ).run(specId2, "Test Spec 2", "building", "/tmp/test2.md");
    const run2 = createRun(db, { spec_id: specId2 });
    updateRunStatus(db, run2.id, "failed", "some error");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(2);

    const pausedRuns = resumable.filter((r) => r.status === "paused");
    const failedRuns = resumable.filter((r) => r.status === "failed");
    expect(pausedRuns.length).toBe(1);
    expect(failedRuns.length).toBe(1);
  });
});

describe("Budget auto-pause + manual pause use same infrastructure", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("both reasons produce run-paused events", async () => {
    const run1 = setupRunning(db, { costUsd: 15, budgetUsd: 15 });
    await pauseRun(db, mockRuntime, run1.id, "budget_exceeded");

    const specId2 = "spec_test2";
    db.prepare(
      "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
    ).run(specId2, "Test Spec 2", "building", "/tmp/test2.md");
    const run2 = createRun(db, { spec_id: specId2 });
    updateRunStatus(db, run2.id, "running");
    await pauseRun(db, mockRuntime, run2.id, "manual");

    const events1 = listEvents(db, run1.id, { type: "run-paused" as any });
    const events2 = listEvents(db, run2.id, { type: "run-paused" as any });

    expect(JSON.parse(events1[0].data!).reason).toBe("budget_exceeded");
    expect(JSON.parse(events2[0].data!).reason).toBe("manual");
  });

  test("both reasons allow resume via same path", async () => {
    const run1 = setupRunning(db, { costUsd: 15, budgetUsd: 15 });
    await pauseRun(db, mockRuntime, run1.id, "budget_exceeded");

    const result = resumePausedRun(db, run1.id, 25);
    expect(result.success).toBe(true);

    const run = getRun(db, run1.id)!;
    expect(run.status).toBe("running");
    expect(run.budget_usd).toBe(25);
  });
});
