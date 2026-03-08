import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { getResumableRuns } from "../../../src/pipeline/resume.js";
import { formatPauseResumeMessage } from "../../../src/commands/continue.js";

describe("formatPauseResumeMessage", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("formats message for paused run with budget info", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    db.prepare("UPDATE runs SET cost_usd = 14.87, status = 'paused' WHERE id = ?").run(run.id);

    const updatedRun = getRun(db, run.id)!;
    const msg = formatPauseResumeMessage(updatedRun, 25);
    expect(msg).toContain("Resuming paused run");
    expect(msg).toContain(run.id);
    expect(msg).toContain("$14.87 spent");
    expect(msg).toContain("new budget: $25");
  });

  test("formats message for failed run without budget context", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "failed", "build error");

    const updatedRun = getRun(db, run.id)!;
    const msg = formatPauseResumeMessage(updatedRun);
    expect(msg).toContain("Resuming");
    expect(msg).toContain(run.id);
    expect(msg).not.toContain("new budget");
  });

  test("formats message for paused run without new budget", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    db.prepare("UPDATE runs SET cost_usd = 10.0, status = 'paused' WHERE id = ?").run(run.id);

    const updatedRun = getRun(db, run.id)!;
    const msg = formatPauseResumeMessage(updatedRun);
    expect(msg).toContain("Resuming paused run");
    expect(msg).toContain("$10.00 spent");
  });
});

describe("getResumableRuns output for paused runs", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("paused runs show budget reason in error field", () => {
    const run = createRun(db, { spec_id: "test-spec", budget_usd: 15 });
    updateRunStatus(db, run.id, "paused", "budget_exceeded");
    updateRunPhase(db, run.id, "build");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(1);
    expect(resumable[0].status).toBe("paused");
    expect(resumable[0].error).toBe("budget_exceeded");
  });
});
