import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun, getRun } from "../../../src/db/queries/runs.js";
import {
  pauseRun,
  resumeRun,
  getPausedRuns,
  getRunPauseState,
} from "../../../src/db/queries/pause-state.js";
import type { SqliteDb } from "../../../src/db/index.js";

describe("Pause State Queries", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("pauseRun sets status to paused with reason and timestamp", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    // Simulate running state
    db.prepare("UPDATE runs SET status = 'running' WHERE id = ?").run(run.id);

    pauseRun(db, run.id, "budget_exceeded");

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("paused");
    expect(updated.pause_reason).toBe("budget_exceeded");
    expect(updated.paused_at).not.toBeNull();
  });

  test("pauseRun with manual reason", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    db.prepare("UPDATE runs SET status = 'running' WHERE id = ?").run(run.id);

    pauseRun(db, run.id, "manual");

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("paused");
    expect(updated.pause_reason).toBe("manual");
    expect(updated.paused_at).not.toBeNull();
  });

  test("resumeRun clears pause state and sets new budget", () => {
    const run = createRun(db, { spec_id: "spec_1", budget_usd: 15 });
    db.prepare("UPDATE runs SET status = 'running' WHERE id = ?").run(run.id);
    pauseRun(db, run.id, "budget_exceeded");

    resumeRun(db, run.id, 25);

    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("running");
    expect(updated.paused_at).toBeNull();
    expect(updated.pause_reason).toBeNull();
    expect(updated.budget_usd).toBe(25);
  });

  test("getPausedRuns returns only paused runs", () => {
    const run1 = createRun(db, { spec_id: "spec_1" });
    const run2 = createRun(db, { spec_id: "spec_2" });
    db.prepare("UPDATE runs SET status = 'running' WHERE id = ?").run(run1.id);
    db.prepare("UPDATE runs SET status = 'running' WHERE id = ?").run(run2.id);

    pauseRun(db, run1.id, "budget_exceeded");

    const paused = getPausedRuns(db);
    expect(paused.length).toBe(1);
    expect(paused[0].id).toBe(run1.id);
  });

  test("getRunPauseState returns pause details for a paused run", () => {
    const run = createRun(db, { spec_id: "spec_1", budget_usd: 15 });
    db.prepare("UPDATE runs SET status = 'running', cost_usd = 14.87 WHERE id = ?").run(run.id);
    pauseRun(db, run.id, "budget_exceeded");

    const state = getRunPauseState(db, run.id);
    expect(state).not.toBeNull();
    expect(state!.pause_reason).toBe("budget_exceeded");
    expect(state!.paused_at).not.toBeNull();
    expect(state!.cost_usd).toBe(14.87);
    expect(state!.budget_usd).toBe(15);
  });

  test("getRunPauseState returns null for non-paused run", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    const state = getRunPauseState(db, run.id);
    expect(state).toBeNull();
  });

  test("resumeRun rejects if run is not paused", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    expect(() => resumeRun(db, run.id, 25)).toThrow();
  });

  test("resumeRun rejects if new budget <= current spend", () => {
    const run = createRun(db, { spec_id: "spec_1", budget_usd: 15 });
    db.prepare("UPDATE runs SET status = 'running', cost_usd = 14.87 WHERE id = ?").run(run.id);
    pauseRun(db, run.id, "budget_exceeded");

    expect(() => resumeRun(db, run.id, 14)).toThrow("must exceed current spend");
  });
});
