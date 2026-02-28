import { describe, test, expect } from "bun:test";
import { validateBuildplan } from "../../../src/pipeline/validation.js";

const VALID_PLAN = JSON.stringify({
  spec_id: "s1",
  modules: [
    { id: "m1", title: "Module 1", description: "test", scope: { creates: [], modifies: [], test_files: [] }, estimated_complexity: "low", estimated_tokens: 1000, estimated_duration_min: 5 },
    { id: "m2", title: "Module 2", description: "test", scope: { creates: [], modifies: [], test_files: [] }, estimated_complexity: "medium", estimated_tokens: 2000, estimated_duration_min: 10 },
  ],
  contracts: [
    { name: "API Types", description: "Shared types", format: "typescript", content: "interface Foo {}", bound_modules: ["m1", "m2"], binding_roles: { m1: "implementer", m2: "consumer" } },
  ],
  dependencies: [
    { from: "m2", to: "m1", type: "completion" },
  ],
  parallelism: { max_concurrent: 2, parallel_groups: [{ phase: 1, modules: ["m1"] }, { phase: 2, modules: ["m2"] }], critical_path: ["m1", "m2"], critical_path_estimated_min: 15 },
  integration_strategy: { checkpoints: [], final_integration: "Run all tests" },
  risks: [],
  total_estimated_tokens: 3000,
  total_estimated_cost_usd: 1.5,
  total_estimated_duration_min: 15,
});

describe("validateBuildplan", () => {
  test("valid plan passes", () => {
    const result = validateBuildplan(VALID_PLAN);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("invalid JSON fails", () => {
    const result = validateBuildplan("not json");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid JSON");
  });

  test("missing modules fails", () => {
    const result = validateBuildplan(JSON.stringify({ contracts: [], dependencies: [], parallelism: {}, integration_strategy: {} }));
    expect(result.valid).toBe(false);
  });

  test("duplicate module IDs fail", () => {
    const plan = JSON.parse(VALID_PLAN);
    plan.modules.push({ ...plan.modules[0] }); // duplicate m1
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Duplicate"))).toBe(true);
  });

  test("dependency referencing unknown module fails", () => {
    const plan = JSON.parse(VALID_PLAN);
    plan.dependencies.push({ from: "m2", to: "m_nonexistent", type: "completion" });
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("unknown module"))).toBe(true);
  });

  test("cycle detection fails", () => {
    const plan = JSON.parse(VALID_PLAN);
    plan.dependencies.push({ from: "m1", to: "m2", type: "completion" });
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("cycle"))).toBe(true);
  });

  test("contract without content fails", () => {
    const plan = JSON.parse(VALID_PLAN);
    plan.contracts.push({ name: "Empty", description: "", format: "ts", content: "" });
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("missing 'content'"))).toBe(true);
  });

  test("contract referencing unknown module fails", () => {
    const plan = JSON.parse(VALID_PLAN);
    plan.contracts[0].bound_modules.push("m_fake");
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
  });

  test("missing estimates produce warnings", () => {
    const plan = JSON.parse(VALID_PLAN);
    delete plan.total_estimated_tokens;
    const result = validateBuildplan(JSON.stringify(plan));
    expect(result.valid).toBe(true); // warnings don't fail
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
