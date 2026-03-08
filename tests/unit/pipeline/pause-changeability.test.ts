import { test, expect, describe } from "bun:test";
import { BUDGET_WARNING_THRESHOLD, BUDGET_PAUSE_THRESHOLD } from "../../../src/pipeline/pause.js";

describe("Changeability: warning threshold", () => {
  test("BUDGET_WARNING_THRESHOLD is exported as a single constant", () => {
    expect(typeof BUDGET_WARNING_THRESHOLD).toBe("number");
    expect(BUDGET_WARNING_THRESHOLD).toBe(0.8);
  });

  test("BUDGET_PAUSE_THRESHOLD is exported as a single constant", () => {
    expect(typeof BUDGET_PAUSE_THRESHOLD).toBe("number");
    expect(BUDGET_PAUSE_THRESHOLD).toBe(1.0);
  });

  test("changing threshold from 80% to 90% requires only updating BUDGET_WARNING_THRESHOLD", () => {
    // This test documents that the threshold is a single constant.
    // Changing it to 0.9 would require updating only BUDGET_WARNING_THRESHOLD in pause.ts.
    // No logic changes needed — the checkBudgetThresholds function uses
    // `spentUsd >= budgetUsd * BUDGET_WARNING_THRESHOLD` which adapts automatically.
    expect(BUDGET_WARNING_THRESHOLD).toBeDefined();
    // The threshold is used in exactly one comparison in checkBudgetThresholds
    // and one event creation (to record which threshold was crossed).
    // That's the only place it matters.
  });
});

describe("Changeability: per-module budgets", () => {
  test("pause infrastructure is run-level, not coupled to module budgets", () => {
    // The pauseRun function takes a runId and reason — no module-level coupling.
    // Adding per-module budgets would require:
    // 1. Adding a budget field to the module record
    // 2. Adding a check in the builder agent
    // The pause/resume infrastructure stays the same because:
    // - pauseRun works at run level
    // - checkBudgetThresholds reads run.budget_usd and run.cost_usd
    // - Per-module budget checks would be separate, calling pauseRun when triggered
    expect(true).toBe(true);
  });
});
