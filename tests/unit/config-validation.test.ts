import { test, expect, describe } from "bun:test";
import { validateConfig, type ValidationError } from "../../src/utils/config-validation.js";

describe("Config validation", () => {
  test("accepts valid config", () => {
    const errors = validateConfig({
      build: { max_parallel: 4, budget_usd: 50, max_iterations: 3, max_module_retries: 2 },
      thresholds: { satisfaction: 0.8, changeability: 0.6 },
      runtime: { heartbeat_timeout_ms: 90000 },
    });
    expect(errors).toEqual([]);
  });

  test("rejects negative budget", () => {
    const errors = validateConfig({ build: { budget_usd: -5 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.budget_usd");
    expect(errors[0].message).toContain("positive");
  });

  test("rejects max_parallel = 0", () => {
    const errors = validateConfig({ build: { max_parallel: 0 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_parallel");
  });

  test("rejects max_parallel > 16", () => {
    const errors = validateConfig({ build: { max_parallel: 20 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_parallel");
  });

  test("rejects satisfaction > 1.0", () => {
    const errors = validateConfig({ thresholds: { satisfaction: 1.5 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("thresholds.satisfaction");
  });

  test("rejects satisfaction < 0", () => {
    const errors = validateConfig({ thresholds: { satisfaction: -0.1 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("thresholds.satisfaction");
  });

  test("rejects heartbeat_timeout = 0", () => {
    const errors = validateConfig({ runtime: { heartbeat_timeout_ms: 0 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("runtime.heartbeat_timeout_ms");
  });

  test("rejects max_iterations = 0", () => {
    const errors = validateConfig({ build: { max_iterations: 0 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_iterations");
  });

  test("rejects max_iterations > 10", () => {
    const errors = validateConfig({ build: { max_iterations: 11 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_iterations");
  });

  test("rejects max_module_retries < 0", () => {
    const errors = validateConfig({ build: { max_module_retries: -1 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_module_retries");
  });

  test("rejects max_module_retries > 5", () => {
    const errors = validateConfig({ build: { max_module_retries: 6 } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("build.max_module_retries");
  });

  test("returns multiple errors for multiple invalid fields", () => {
    const errors = validateConfig({
      build: { budget_usd: -5, max_parallel: 0 },
      thresholds: { satisfaction: 2.0 },
    });
    expect(errors.length).toBe(3);
  });

  test("accepts empty partial config", () => {
    const errors = validateConfig({});
    expect(errors).toEqual([]);
  });
});
