import { beforeEach, describe, expect, test } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createEvent } from "../../../src/db/queries/events.js";
import {
  createRun,
  getRun,
  updateRunPhase,
  updateRunStatus,
} from "../../../src/db/queries/runs.js";
import { PHASE_ORDER } from "../../../src/pipeline/phases.js";
import {
  getCompletedModules,
  getResumableRuns,
  getResumePoint,
} from "../../../src/pipeline/resume.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("getResumableRuns", () => {
  test("returns empty array when no runs exist", () => {
    const runs = getResumableRuns(db);
    expect(runs).toEqual([]);
  });

  test("returns failed runs", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed", "build exploded");
    updateRunPhase(db, run.id, "build");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(run.id);
    expect(runs[0].status).toBe("failed");
    expect(runs[0].error).toBe("build exploded");
  });

  test("returns running runs with no active agents", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    // Create agent that completed (no active agents)
    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-1",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(run.id);
  });

  test("does NOT return running runs with active agents", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    // Create an active agent
    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-1",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "running");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(0);
  });

  test("does NOT return completed runs", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "completed");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(0);
  });

  test("does NOT return pending runs", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    // Default status is pending

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(0);
  });

  test("returns runs ordered by created_at DESC", () => {
    const run1 = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run1.id, "failed", "error 1");
    updateRunPhase(db, run1.id, "build");

    const run2 = createRun(db, { spec_id: "spec_2" });
    updateRunStatus(db, run2.id, "failed", "error 2");
    updateRunPhase(db, run2.id, "architect");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(2);
    // Most recent first
    expect(runs[0].id).toBe(run2.id);
    expect(runs[1].id).toBe(run1.id);
  });

  test("returned objects have expected shape", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed", "oops");
    updateRunPhase(db, run.id, "build");

    const runs = getResumableRuns(db);
    expect(runs).toHaveLength(1);
    const r = runs[0];
    expect(r.id).toBeDefined();
    expect(r.spec_id).toBe("spec_1");
    expect(r.status).toBe("failed");
    expect(r.current_phase).toBe("build");
    expect(r.created_at).toBeDefined();
    expect(r.error).toBe("oops");
  });
});

describe("getResumePoint", () => {
  test("returns first phase when no phase-completed events exist", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed");

    const phase = getResumePoint(db, run.id);
    expect(phase).toBe("scout");
  });

  test("returns next phase after last completed phase", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed");

    // Mark scout and architect as completed
    createEvent(db, run.id, "phase-completed", { phase: "scout" });
    createEvent(db, run.id, "phase-completed", { phase: "architect" });
    createEvent(db, run.id, "phase-completed", { phase: "plan-review" });

    const phase = getResumePoint(db, run.id);
    expect(phase).toBe("build");
  });

  test("returns build if all phases before build completed", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed");

    createEvent(db, run.id, "phase-completed", { phase: "scout" });
    createEvent(db, run.id, "phase-completed", { phase: "architect" });
    createEvent(db, run.id, "phase-completed", { phase: "plan-review" });

    const phase = getResumePoint(db, run.id);
    expect(phase).toBe("build");
  });

  test("throws if all phases completed", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed");

    // Complete ALL phases
    for (const phase of PHASE_ORDER) {
      createEvent(db, run.id, "phase-completed", { phase });
    }

    expect(() => getResumePoint(db, run.id)).toThrow();
  });

  test("handles non-sequential completion events correctly", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    updateRunStatus(db, run.id, "failed");

    // Only scout completed (but with gaps)
    createEvent(db, run.id, "phase-completed", { phase: "scout" });

    const phase = getResumePoint(db, run.id);
    expect(phase).toBe("architect");
  });
});

describe("getCompletedModules", () => {
  test("returns empty set when no builders exist", () => {
    const run = createRun(db, { spec_id: "spec_1" });
    const modules = getCompletedModules(db, run.id);
    expect(modules.size).toBe(0);
  });

  test("returns module IDs of completed builders", () => {
    const run = createRun(db, { spec_id: "spec_1" });

    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "completed");

    const modules = getCompletedModules(db, run.id);
    expect(modules.size).toBe(2);
    expect(modules.has("mod-a")).toBe(true);
    expect(modules.has("mod-b")).toBe(true);
  });

  test("does not include failed builders", () => {
    const run = createRun(db, { spec_id: "spec_1" });

    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "failed");

    const modules = getCompletedModules(db, run.id);
    expect(modules.size).toBe(1);
    expect(modules.has("mod-a")).toBe(true);
    expect(modules.has("mod-b")).toBe(false);
  });

  test("does not include non-builder agents", () => {
    const run = createRun(db, { spec_id: "spec_1" });

    const architect = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "architect-1",
      system_prompt: "test",
    });
    updateAgentStatus(db, architect.id, "completed");

    const builder = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, builder.id, "completed");

    const modules = getCompletedModules(db, run.id);
    expect(modules.size).toBe(1);
    expect(modules.has("mod-a")).toBe(true);
  });

  test("ignores builders with null module_id", () => {
    const run = createRun(db, { spec_id: "spec_1" });

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-main",
      // no module_id
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    const modules = getCompletedModules(db, run.id);
    expect(modules.size).toBe(0);
  });
});
