import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { getResumePoint } from "../../../src/pipeline/resume.js";
import { getCompletedModules } from "../../../src/pipeline/resume.js";
import type { PhaseName } from "../../../src/pipeline/phases.js";

describe("getResumePoint", () => {
  let db: SqliteDb;
  let runId: string;

  beforeEach(() => {
    db = getDbForTest();
    const run = createRun(db, { spec_id: "test-spec" });
    runId = run.id;
    updateRunStatus(db, runId, "failed");
  });

  test("returns 'scout' when no phases completed", () => {
    const point = getResumePoint(db, runId);
    expect(point).toBe("scout");
  });

  test("returns 'architect' when scout is completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    const point = getResumePoint(db, runId);
    expect(point).toBe("architect");
  });

  test("returns 'build' when architect and plan-review are completed", () => {
    createEvent(db, runId, "phase-completed", { phase: "scout" });
    createEvent(db, runId, "phase-completed", { phase: "architect" });
    createEvent(db, runId, "phase-completed", { phase: "plan-review" });
    const point = getResumePoint(db, runId);
    expect(point).toBe("build");
  });

  test("returns 'integrate' when build is completed", () => {
    for (const phase of ["scout", "architect", "plan-review", "build"]) {
      createEvent(db, runId, "phase-completed", { phase });
    }
    const point = getResumePoint(db, runId);
    expect(point).toBe("integrate");
  });

  test("returns 'merge' when all phases except merge are completed", () => {
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change"]) {
      createEvent(db, runId, "phase-completed", { phase });
    }
    const point = getResumePoint(db, runId);
    expect(point).toBe("merge");
  });

  test("throws if all phases are completed", () => {
    for (const phase of ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change", "merge"]) {
      createEvent(db, runId, "phase-completed", { phase });
    }
    expect(() => getResumePoint(db, runId)).toThrow();
  });

  test("ignores phase-started events (only looks at phase-completed)", () => {
    createEvent(db, runId, "phase-started", { phase: "scout" });
    // Only started, not completed — should still resume from scout
    const point = getResumePoint(db, runId);
    expect(point).toBe("scout");
  });
});

describe("getCompletedModules", () => {
  let db: SqliteDb;
  let runId: string;

  beforeEach(() => {
    db = getDbForTest();
    const run = createRun(db, { spec_id: "test-spec" });
    runId = run.id;
  });

  test("returns empty set when no builders exist", () => {
    const result = getCompletedModules(db, runId);
    expect(result.size).toBe(0);
  });

  test("returns completed builder module IDs", () => {
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "completed");

    const result = getCompletedModules(db, runId);
    expect(result.size).toBe(2);
    expect(result.has("mod-a")).toBe(true);
    expect(result.has("mod-b")).toBe(true);
  });

  test("excludes failed builders", () => {
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "failed", "some error");

    const result = getCompletedModules(db, runId);
    expect(result.size).toBe(1);
    expect(result.has("mod-a")).toBe(true);
    expect(result.has("mod-b")).toBe(false);
  });

  test("excludes non-builder agents", () => {
    const builder = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, builder.id, "completed");

    const architect = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-1",
      system_prompt: "test",
    });
    updateAgentStatus(db, architect.id, "completed");

    const result = getCompletedModules(db, runId);
    expect(result.size).toBe(1);
    expect(result.has("mod-a")).toBe(true);
  });

  test("handles builders without module_id gracefully", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-main",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    // Should not crash; builder without module_id is excluded
    const result = getCompletedModules(db, runId);
    expect(result.size).toBe(0);
  });
});
