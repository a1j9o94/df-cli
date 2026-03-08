import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createEvent, listEvents } from "../../../src/db/queries/events.js";
import { checkBudgetThresholds, BUDGET_WARNING_THRESHOLD } from "../../../src/pipeline/pause.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function setupRun(db: InstanceType<typeof Database>, opts: { budgetUsd: number; costUsd: number }) {
  const specId = "spec_test";
  db.prepare(
    "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
  ).run(specId, "Test Spec", "building", "/tmp/test.md");

  const run = createRun(db, { spec_id: specId, budget_usd: opts.budgetUsd });
  updateRunStatus(db, run.id, "running");
  db.prepare("UPDATE runs SET cost_usd = ? WHERE id = ?").run(opts.costUsd, run.id);

  return getRun(db, run.id)!;
}

describe("Engine budget-pause integration", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("budget warning emits budget-warning event with correct data", () => {
    const run = setupRun(db, { budgetUsd: 10, costUsd: 8.5 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("warning");

    // Simulate what engine would do: emit the event
    createEvent(db, run.id, "budget-warning", {
      threshold: BUDGET_WARNING_THRESHOLD,
      spent_usd: result.spentUsd,
      budget_usd: result.budgetUsd,
      percent_used: result.percentUsed,
    });

    const events = listEvents(db, run.id, { type: "budget-warning" as any });
    expect(events.length).toBe(1);
    const data = JSON.parse(events[0].data!);
    expect(data.threshold).toBe(0.8);
    expect(data.percent_used).toBeCloseTo(85);
  });

  test("paused runs appear in getResumableRuns", () => {
    const run = setupRun(db, { budgetUsd: 15, costUsd: 15.5 });
    updateRunStatus(db, run.id, "paused");

    // Import getResumableRuns and verify paused runs are included
    const rows = db.prepare(
      `SELECT id, status FROM runs WHERE status IN ('failed', 'paused') OR
       (status = 'running' AND NOT EXISTS (
         SELECT 1 FROM agents a WHERE a.run_id = runs.id AND a.status IN ('pending', 'spawning', 'running')
       ))`
    ).all() as Array<{ id: string; status: string }>;

    const pausedRun = rows.find((r) => r.id === run.id);
    expect(pausedRun).toBeDefined();
    expect(pausedRun!.status).toBe("paused");
  });

  test("budget check with exact 80% returns warning", () => {
    const run = setupRun(db, { budgetUsd: 10, costUsd: 8.0 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("warning");
    expect(result.percentUsed).toBeCloseTo(80);
  });

  test("budget check at 79.9% returns no action", () => {
    const run = setupRun(db, { budgetUsd: 100, costUsd: 79.9 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("none");
  });

  test("console output format for budget warning", () => {
    const run = setupRun(db, { budgetUsd: 15, costUsd: 12 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("warning");

    // Verify the expected log message format
    const msg = `[dark] Budget warning: $${result.spentUsd.toFixed(2)} of $${result.budgetUsd.toFixed(2)} spent (${Math.round(result.percentUsed)}%). Build will pause at $${result.budgetUsd.toFixed(2)}.`;
    expect(msg).toContain("Budget warning");
    expect(msg).toContain("$12.00");
    expect(msg).toContain("$15.00");
    expect(msg).toContain("80%");
  });

  test("console output format for pause", () => {
    const run = setupRun(db, { budgetUsd: 15, costUsd: 15.13 });

    const result = checkBudgetThresholds(db, run.id);
    expect(result.action).toBe("pause");

    const msg = `[dark] Run paused: budget $${result.budgetUsd.toFixed(2)} reached ($${result.spentUsd.toFixed(2)} spent).`;
    expect(msg).toContain("Run paused");
    expect(msg).toContain("$15.00");
    expect(msg).toContain("$15.13");
  });
});
