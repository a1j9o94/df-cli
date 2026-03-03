import { describe, test, expect } from "bun:test";
import { shouldSkipPhase } from "../../../src/pipeline/phases.js";

describe("skip_change_eval flag replaces --mode quick", () => {
  test("skips evaluate-change when skip_change_eval is true", () => {
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: true })).toBe(true);
  });

  test("does not skip evaluate-change when skip_change_eval is false", () => {
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: false })).toBe(false);
  });

  test("does not skip evaluate-change when skip_change_eval is absent (defaults to false)", () => {
    expect(shouldSkipPhase("evaluate-change", {})).toBe(false);
  });

  test("skip_change_eval does not affect other phases", () => {
    expect(shouldSkipPhase("scout", { skip_change_eval: true })).toBe(false);
    expect(shouldSkipPhase("build", { skip_change_eval: true })).toBe(false);
    expect(shouldSkipPhase("merge", { skip_change_eval: true })).toBe(false);
    expect(shouldSkipPhase("evaluate-functional", { skip_change_eval: true })).toBe(false);
  });
});
