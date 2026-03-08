import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { getResumableRuns } from "../../../src/pipeline/resume.js";

describe("getResumableRuns includes paused runs", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("returns paused runs as resumable", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "paused");
    updateRunPhase(db, run.id, "build");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(1);
    expect(resumable[0].id).toBe(run.id);
    expect(resumable[0].status).toBe("paused");
  });

  test("returns paused runs alongside failed runs", () => {
    const run1 = createRun(db, { spec_id: "test-spec-1" });
    updateRunStatus(db, run1.id, "paused");
    updateRunPhase(db, run1.id, "build");

    const run2 = createRun(db, { spec_id: "test-spec-2" });
    updateRunStatus(db, run2.id, "failed", "some error");
    updateRunPhase(db, run2.id, "architect");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(2);
    const ids = resumable.map((r) => r.id);
    expect(ids).toContain(run1.id);
    expect(ids).toContain(run2.id);
  });

  test("does not return completed runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "completed");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(0);
  });

  test("does not return cancelled runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "cancelled");

    const resumable = getResumableRuns(db);
    expect(resumable.length).toBe(0);
  });
});
