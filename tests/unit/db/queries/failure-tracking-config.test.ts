import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../../../../src/types/config.js";

describe("failure tracking config", () => {
  test("DEFAULT_CONFIG includes max_module_retries with default of 2", () => {
    expect(DEFAULT_CONFIG.build.max_module_retries).toBe(2);
  });

  test("max_module_retries is a number in DfConfig", () => {
    expect(typeof DEFAULT_CONFIG.build.max_module_retries).toBe("number");
  });

  test("default threshold matches spec requirement", () => {
    // Spec says: "Configurable threshold in config.yaml: build.max_module_retries: 2 (default)"
    expect(DEFAULT_CONFIG.build.max_module_retries).toBe(2);
  });

  test("config structure has all expected build fields", () => {
    expect(DEFAULT_CONFIG.build).toEqual({
      default_mode: "thorough",
      max_parallel: 4,
      budget_usd: 50.0,
      max_iterations: 3,
      cost_per_minute: 0.05,
      max_module_retries: 2,
    });
  });
});
