import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { validateContinueRun } from "../../../src/commands/continue.js";

describe("validateContinueRun", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("accepts paused runs as resumable", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "paused");
    updateRunPhase(db, run.id, "build");

    const result = validateContinueRun(db, run.id);
    expect(result.valid).toBe(true);
  });

  test("accepts failed runs as resumable", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed", "some error");

    const result = validateContinueRun(db, run.id);
    expect(result.valid).toBe(true);
  });

  test("rejects completed runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "completed");

    const result = validateContinueRun(db, run.id);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not resumable");
  });

  test("rejects cancelled runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "cancelled");

    const result = validateContinueRun(db, run.id);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not resumable");
  });

  test("rejects non-existent runs", () => {
    const result = validateContinueRun(db, "nonexistent-run");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });
});

describe("validateBudgetForPausedRun", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("rejects new budget that is less than current spend", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    // Simulate spending $14.87
    db.prepare("UPDATE runs SET cost_usd = 14.87, status = 'paused' WHERE id = ?").run(run.id);

    const { validateBudgetForPausedRun } = require("../../../src/commands/continue.js");
    const result = validateBudgetForPausedRun(db, run.id, 14);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("must exceed current spend");
    expect(result.error).toContain("$14");
    expect(result.error).toContain("$14.87");
  });

  test("rejects new budget equal to current spend", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    db.prepare("UPDATE runs SET cost_usd = 14.87, status = 'paused' WHERE id = ?").run(run.id);

    const { validateBudgetForPausedRun } = require("../../../src/commands/continue.js");
    const result = validateBudgetForPausedRun(db, run.id, 14.87);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("must exceed current spend");
  });

  test("accepts new budget greater than current spend", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    db.prepare("UPDATE runs SET cost_usd = 14.87, status = 'paused' WHERE id = ?").run(run.id);

    const { validateBudgetForPausedRun } = require("../../../src/commands/continue.js");
    const result = validateBudgetForPausedRun(db, run.id, 25);
    expect(result.valid).toBe(true);
  });
});
