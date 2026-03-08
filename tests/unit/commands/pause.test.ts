import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { validatePauseRun, getPausableRun } from "../../../src/commands/pause.js";

describe("validatePauseRun", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("accepts running runs for pausing", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "running");

    const result = validatePauseRun(db, run.id);
    expect(result.valid).toBe(true);
  });

  test("rejects already paused runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "paused");

    const result = validatePauseRun(db, run.id);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("already paused");
  });

  test("rejects completed runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "completed");

    const result = validatePauseRun(db, run.id);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not pausable");
  });

  test("rejects failed runs", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "failed", "error");

    const result = validatePauseRun(db, run.id);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not pausable");
  });

  test("rejects non-existent runs", () => {
    const result = validatePauseRun(db, "nonexistent");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });
});

describe("getPausableRun", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("returns a running run when no run-id specified", () => {
    const run1 = createRun(db, { spec_id: "test-spec-1" });
    updateRunStatus(db, run1.id, "running");

    const result = getPausableRun(db);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(run1.id);
    expect(result!.status).toBe("running");
  });

  test("returns null when no running runs exist", () => {
    const run = createRun(db, { spec_id: "test-spec" });
    updateRunStatus(db, run.id, "completed");

    const result = getPausableRun(db);
    expect(result).toBeNull();
  });

  test("ignores non-running runs", () => {
    const run1 = createRun(db, { spec_id: "test-spec-1" });
    updateRunStatus(db, run1.id, "failed");

    const run2 = createRun(db, { spec_id: "test-spec-2" });
    updateRunStatus(db, run2.id, "running");

    const result = getPausableRun(db);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(run2.id);
  });
});
