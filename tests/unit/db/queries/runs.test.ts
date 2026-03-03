import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  createRun, getRun, listRuns,
  updateRunStatus, updateRunPhase, updateRunCost, incrementRunIteration,
} from "../../../../src/db/queries/runs.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("runs queries", () => {
  test("createRun inserts and returns a run", () => {
    const run = createRun(db, { spec_id: "spec_test1" });
    expect(run.id).toMatch(/^run_/);
    expect(run.spec_id).toBe("spec_test1");
    expect(run.status).toBe("pending");
    expect(run.skip_change_eval).toBe(false);
    expect(run.max_parallel).toBe(4);
    expect(run.budget_usd).toBe(50.0);
    expect(run.cost_usd).toBe(0);
    expect(run.iteration).toBe(0);
  });

  test("createRun respects options", () => {
    const run = createRun(db, {
      spec_id: "spec_test2",
      skip_change_eval: true,
      max_parallel: 2,
      budget_usd: 10,
      max_iterations: 5,
    });
    expect(run.skip_change_eval).toBe(true);
    expect(run.max_parallel).toBe(2);
    expect(run.budget_usd).toBe(10);
    expect(run.max_iterations).toBe(5);
  });

  test("getRun returns null for missing id", () => {
    expect(getRun(db, "nonexistent")).toBeNull();
  });

  test("listRuns returns all runs", () => {
    createRun(db, { spec_id: "s1" });
    createRun(db, { spec_id: "s2" });
    expect(listRuns(db)).toHaveLength(2);
  });

  test("listRuns filters by specId", () => {
    createRun(db, { spec_id: "s1" });
    createRun(db, { spec_id: "s1" });
    createRun(db, { spec_id: "s2" });
    expect(listRuns(db, "s1")).toHaveLength(2);
    expect(listRuns(db, "s2")).toHaveLength(1);
  });

  test("updateRunStatus changes status and error", () => {
    const run = createRun(db, { spec_id: "s1" });
    updateRunStatus(db, run.id, "failed", "something broke");
    const updated = getRun(db, run.id)!;
    expect(updated.status).toBe("failed");
    expect(updated.error).toBe("something broke");
  });

  test("updateRunPhase changes current_phase", () => {
    const run = createRun(db, { spec_id: "s1" });
    updateRunPhase(db, run.id, "build");
    expect(getRun(db, run.id)!.current_phase).toBe("build");
  });

  test("updateRunCost accumulates cost", () => {
    const run = createRun(db, { spec_id: "s1" });
    updateRunCost(db, run.id, 1.5, 1000);
    updateRunCost(db, run.id, 2.0, 500);
    const updated = getRun(db, run.id)!;
    expect(updated.cost_usd).toBe(3.5);
    expect(updated.tokens_used).toBe(1500);
  });

  test("incrementRunIteration bumps iteration count", () => {
    const run = createRun(db, { spec_id: "s1" });
    expect(getRun(db, run.id)!.iteration).toBe(0);
    incrementRunIteration(db, run.id);
    expect(getRun(db, run.id)!.iteration).toBe(1);
    incrementRunIteration(db, run.id);
    expect(getRun(db, run.id)!.iteration).toBe(2);
  });
});
