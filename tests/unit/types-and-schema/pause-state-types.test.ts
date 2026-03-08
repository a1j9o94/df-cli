import { describe, test, expect } from "bun:test";
import type { RunRecord, RunStatus, EventType, PauseReason } from "../../../src/types/index.js";

describe("Pause State Types", () => {
  test("RunRecord includes paused_at field", () => {
    const run: RunRecord = {
      id: "run_test",
      spec_id: "spec_test",
      status: "paused",
      skip_change_eval: false,
      max_parallel: 4,
      budget_usd: 15.0,
      cost_usd: 14.87,
      tokens_used: 0,
      current_phase: "build",
      iteration: 0,
      max_iterations: 3,
      config: "{}",
      error: null,
      paused_at: "2026-03-08T00:00:00Z",
      pause_reason: "budget_exceeded",
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
    };
    expect(run.paused_at).toBe("2026-03-08T00:00:00Z");
    expect(run.pause_reason).toBe("budget_exceeded");
  });

  test("RunRecord paused_at and pause_reason can be null", () => {
    const run: RunRecord = {
      id: "run_test",
      spec_id: "spec_test",
      status: "running",
      skip_change_eval: false,
      max_parallel: 4,
      budget_usd: 50.0,
      cost_usd: 0.0,
      tokens_used: 0,
      current_phase: null,
      iteration: 0,
      max_iterations: 3,
      config: "{}",
      error: null,
      paused_at: null,
      pause_reason: null,
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
    };
    expect(run.paused_at).toBeNull();
    expect(run.pause_reason).toBeNull();
  });

  test("RunStatus includes 'paused'", () => {
    const status: RunStatus = "paused";
    expect(status).toBe("paused");
  });

  test("EventType includes run-paused", () => {
    const evt: EventType = "run-paused";
    expect(evt).toBe("run-paused");
  });

  test("EventType includes budget-warning", () => {
    const evt: EventType = "budget-warning";
    expect(evt).toBe("budget-warning");
  });

  test("PauseReason type supports budget_exceeded and manual", () => {
    const reason1: PauseReason = "budget_exceeded";
    const reason2: PauseReason = "manual";
    expect(reason1).toBe("budget_exceeded");
    expect(reason2).toBe("manual");
  });
});
