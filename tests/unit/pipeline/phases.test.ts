import { describe, test, expect } from "bun:test";
import { getNextPhase, shouldSkipPhase } from "../../../src/pipeline/phases.js";

describe("getNextPhase", () => {
  test("returns next phase in order", () => {
    expect(getNextPhase("scout")).toBe("architect");
    expect(getNextPhase("architect")).toBe("plan-review");
    expect(getNextPhase("build")).toBe("integrate");
  });

  test("returns null for last phase", () => {
    expect(getNextPhase("merge")).toBeNull();
  });
});

describe("shouldSkipPhase", () => {
  test("skips architect when skip_architect is true", () => {
    expect(shouldSkipPhase("architect", { skip_architect: true })).toBe(true);
    expect(shouldSkipPhase("architect", { skip_architect: false })).toBe(false);
  });

  test("skips plan-review when skip_architect is true", () => {
    expect(shouldSkipPhase("plan-review", { skip_architect: true })).toBe(true);
  });

  test("skips integrate for single module", () => {
    expect(shouldSkipPhase("integrate", { module_count: 1 })).toBe(true);
    expect(shouldSkipPhase("integrate", { module_count: 3 })).toBe(false);
  });

  test("skips evaluate-change when skip_change_eval is true", () => {
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: true })).toBe(true);
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: false })).toBe(false);
  });

  test("never skips build, scout, merge", () => {
    expect(shouldSkipPhase("build", {})).toBe(false);
    expect(shouldSkipPhase("scout", {})).toBe(false);
    expect(shouldSkipPhase("merge", {})).toBe(false);
  });
});
