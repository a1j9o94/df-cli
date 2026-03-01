import { beforeEach, describe, expect, test } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createRun, updateRunStatus } from "../../../src/db/queries/runs.js";
import type { PhaseName } from "../../../src/pipeline/phases.js";
import {
  getCompletedModules,
  getResumableRuns,
  getResumePoint,
} from "../../../src/pipeline/resume.js";
import type { ResumeOptions } from "../../../src/pipeline/resume.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

// ─── getResumePoint ───────────────────────────────────────────────────

describe("getResumePoint", () => {
  test("returns 'scout' when no phases completed", () => {
    const point = getResumePoint(db, runId);
    expect(point).toBe("scout");
  });

  test("returns next phase after last completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    const point = getResumePoint(db, runId);
    expect(point).toBe("architect");
  });

  test("returns 'build' when scout, architect, plan-review completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    createEvent(db, runId, "phase-completed", { phase: "architect" });
    createEvent(db, runId, "phase-completed", { phase: "plan-review" });
    const point = getResumePoint(db, runId);
    expect(point).toBe("build");
  });

  test("returns 'evaluate-functional' when build completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    createEvent(db, runId, "phase-completed", { phase: "architect" });
    createEvent(db, runId, "phase-completed", { phase: "plan-review" });
    createEvent(db, runId, "phase-completed", { phase: "build" });
    createEvent(db, runId, "phase-completed", { phase: "integrate" });
    const point = getResumePoint(db, runId);
    expect(point).toBe("evaluate-functional");
  });

  test("throws when all phases completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    createEvent(db, runId, "phase-completed", { phase: "architect" });
    createEvent(db, runId, "phase-completed", { phase: "plan-review" });
    createEvent(db, runId, "phase-completed", { phase: "build" });
    createEvent(db, runId, "phase-completed", { phase: "integrate" });
    createEvent(db, runId, "phase-completed", { phase: "evaluate-functional" });
    createEvent(db, runId, "phase-completed", { phase: "evaluate-change" });
    createEvent(db, runId, "phase-completed", { phase: "merge" });

    expect(() => getResumePoint(db, runId)).toThrow();
  });

  test("handles non-sequential completion events", () => {
    // scout completed, architect not — should resume at architect
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    createEvent(db, runId, "phase-started", { phase: "architect" }); // started but not completed
    const point = getResumePoint(db, runId);
    expect(point).toBe("architect");
  });

  test("only considers phase-completed events, not phase-started", () => {
    createEvent(db, runId, "phase-started", { phase: "scout" });
    // No phase-completed for scout
    const point = getResumePoint(db, runId);
    expect(point).toBe("scout");
  });
});

// ─── getCompletedModules ──────────────────────────────────────────────

describe("getCompletedModules", () => {
  test("returns empty set when no builders exist", () => {
    const modules = getCompletedModules(db, runId);
    expect(modules).toBeInstanceOf(Set);
    expect(modules.size).toBe(0);
  });

  test("returns module_ids of completed builders", () => {
    createAgent(db, {
      agent_id: "agt_b1",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      module_id: "mod-foo",
      system_prompt: "build foo",
    });
    // Manually set status to completed
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run("agt_b1");

    createAgent(db, {
      agent_id: "agt_b2",
      run_id: runId,
      role: "builder",
      name: "builder-2",
      module_id: "mod-bar",
      system_prompt: "build bar",
    });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run("agt_b2");

    const modules = getCompletedModules(db, runId);
    expect(modules.size).toBe(2);
    expect(modules.has("mod-foo")).toBe(true);
    expect(modules.has("mod-bar")).toBe(true);
  });

  test("excludes failed builders", () => {
    createAgent(db, {
      agent_id: "agt_b3",
      run_id: runId,
      role: "builder",
      name: "builder-3",
      module_id: "mod-ok",
      system_prompt: "build ok",
    });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run("agt_b3");

    createAgent(db, {
      agent_id: "agt_b4",
      run_id: runId,
      role: "builder",
      name: "builder-4",
      module_id: "mod-fail",
      system_prompt: "build fail",
    });
    db.prepare("UPDATE agents SET status = 'failed' WHERE id = ?").run("agt_b4");

    const modules = getCompletedModules(db, runId);
    expect(modules.size).toBe(1);
    expect(modules.has("mod-ok")).toBe(true);
    expect(modules.has("mod-fail")).toBe(false);
  });

  test("excludes non-builder agents", () => {
    createAgent(db, {
      agent_id: "agt_a1",
      run_id: runId,
      role: "architect",
      name: "architect-1",
      system_prompt: "architect prompt",
    });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run("agt_a1");

    const modules = getCompletedModules(db, runId);
    expect(modules.size).toBe(0);
  });

  test("excludes builders from other runs", () => {
    const otherRunId = createRun(db, { spec_id: "spec_other" }).id;

    createAgent(db, {
      agent_id: "agt_b5",
      run_id: otherRunId,
      role: "builder",
      name: "builder-5",
      module_id: "mod-other",
      system_prompt: "build other",
    });
    db.prepare("UPDATE agents SET status = 'completed' WHERE id = ?").run("agt_b5");

    const modules = getCompletedModules(db, runId);
    expect(modules.size).toBe(0);
  });
});

// ─── getResumableRuns ─────────────────────────────────────────────────

describe("getResumableRuns", () => {
  test("returns empty array when no runs", () => {
    // The beforeEach creates a pending run, which shouldn't be resumable
    const runs = getResumableRuns(db);
    expect(runs).toEqual([]);
  });

  test("returns failed runs", () => {
    updateRunStatus(db, runId, "failed", "budget exceeded");
    const runs = getResumableRuns(db);
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe(runId);
    expect(runs[0].status).toBe("failed");
    expect(runs[0].error).toBe("budget exceeded");
  });

  test("returns running runs with no active agents (stale)", () => {
    updateRunStatus(db, runId, "running");

    // No agents at all — stale running run
    const runs = getResumableRuns(db);
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe(runId);
    expect(runs[0].status).toBe("running");
  });

  test("does NOT return running runs with active agents", () => {
    updateRunStatus(db, runId, "running");

    createAgent(db, {
      agent_id: "agt_active",
      run_id: runId,
      role: "builder",
      name: "builder-active",
      system_prompt: "building",
    });
    db.prepare("UPDATE agents SET status = 'running' WHERE id = ?").run("agt_active");

    const runs = getResumableRuns(db);
    expect(runs.length).toBe(0);
  });

  test("does NOT return completed runs", () => {
    updateRunStatus(db, runId, "completed");
    const runs = getResumableRuns(db);
    expect(runs.length).toBe(0);
  });

  test("does NOT return pending runs", () => {
    // run is pending by default
    const runs = getResumableRuns(db);
    expect(runs.length).toBe(0);
  });

  test("orders by created_at DESC", () => {
    // Give the first run an earlier timestamp
    db.prepare("UPDATE runs SET created_at = '2025-01-01T00:00:00Z' WHERE id = ?").run(runId);
    const run2Id = createRun(db, { spec_id: "spec_test2" }).id;
    // Give the second run a later timestamp
    db.prepare("UPDATE runs SET created_at = '2025-06-01T00:00:00Z' WHERE id = ?").run(run2Id);

    updateRunStatus(db, runId, "failed");
    updateRunStatus(db, run2Id, "failed");

    const runs = getResumableRuns(db);
    expect(runs.length).toBe(2);
    // run2 created later, so it should be first (DESC order)
    expect(runs[0].id).toBe(run2Id);
    expect(runs[1].id).toBe(runId);
  });

  test("includes spec_id and current_phase", () => {
    db.prepare("UPDATE runs SET current_phase = ? WHERE id = ?").run("build", runId);
    updateRunStatus(db, runId, "failed");

    const runs = getResumableRuns(db);
    expect(runs.length).toBe(1);
    expect(runs[0].spec_id).toBe("spec_test");
    expect(runs[0].current_phase).toBe("build");
  });
});

// ─── ResumeOptions type ──────────────────────────────────────────────

describe("ResumeOptions", () => {
  test("type is correctly shaped", () => {
    // Type-level test: this should compile
    const opts: ResumeOptions = {
      runId: "run_123",
    };
    expect(opts.runId).toBe("run_123");
    expect(opts.fromPhase).toBeUndefined();
    expect(opts.budgetUsd).toBeUndefined();
  });

  test("accepts optional fromPhase", () => {
    const opts: ResumeOptions = {
      runId: "run_123",
      fromPhase: "build",
    };
    expect(opts.fromPhase).toBe("build");
  });

  test("accepts optional budgetUsd", () => {
    const opts: ResumeOptions = {
      runId: "run_123",
      budgetUsd: 20.0,
    };
    expect(opts.budgetUsd).toBe(20.0);
  });
});
