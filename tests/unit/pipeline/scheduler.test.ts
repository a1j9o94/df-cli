import { describe, test, expect } from "bun:test";
import { buildSchedule, getReadyModules, detectCycles } from "../../../src/pipeline/scheduler.js";
import type { ModuleDefinition, DependencyEdge } from "../../../src/types/index.js";

function mod(id: string, dur = 5): ModuleDefinition {
  return {
    id, title: id, description: "",
    scope: { creates: [], modifies: [], test_files: [] },
    estimated_complexity: "low", estimated_tokens: 100, estimated_duration_min: dur,
  };
}

describe("detectCycles", () => {
  test("returns empty for acyclic graph", () => {
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "B", type: "completion" },
    ];
    expect(detectCycles(deps)).toHaveLength(0);
  });

  test("detects simple cycle", () => {
    const deps: DependencyEdge[] = [
      { from: "A", to: "B", type: "completion" },
      { from: "B", to: "A", type: "completion" },
    ];
    expect(detectCycles(deps).length).toBeGreaterThan(0);
  });

  test("detects longer cycle", () => {
    const deps: DependencyEdge[] = [
      { from: "A", to: "B", type: "completion" },
      { from: "B", to: "C", type: "completion" },
      { from: "C", to: "A", type: "completion" },
    ];
    expect(detectCycles(deps).length).toBeGreaterThan(0);
  });

  test("handles disconnected graph", () => {
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "D", to: "C", type: "completion" },
    ];
    expect(detectCycles(deps)).toHaveLength(0);
  });
});

describe("buildSchedule", () => {
  test("linear chain produces sequential groups", () => {
    const modules = [mod("A"), mod("B"), mod("C")];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "B", type: "completion" },
    ];

    const result = buildSchedule(modules, deps, 4);
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]).toEqual(["A"]);
    expect(result.groups[1]).toEqual(["B"]);
    expect(result.groups[2]).toEqual(["C"]);
  });

  test("independent modules grouped in parallel", () => {
    const modules = [mod("A"), mod("B"), mod("C")];
    const deps: DependencyEdge[] = [];

    const result = buildSchedule(modules, deps, 4);
    // All 3 can run in parallel (within max_parallel of 4)
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].sort()).toEqual(["A", "B", "C"]);
  });

  test("respects max_parallel", () => {
    const modules = [mod("A"), mod("B"), mod("C"), mod("D")];
    const deps: DependencyEdge[] = [];

    const result = buildSchedule(modules, deps, 2);
    // 4 independent modules with max_parallel=2 → 2 groups
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toHaveLength(2);
    expect(result.groups[1]).toHaveLength(2);
  });

  test("diamond dependency pattern", () => {
    // A depends on nothing, B and C depend on A, D depends on B and C
    const modules = [mod("A", 5), mod("B", 10), mod("C", 3), mod("D", 5)];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "A", type: "completion" },
      { from: "D", to: "B", type: "completion" },
      { from: "D", to: "C", type: "completion" },
    ];

    const result = buildSchedule(modules, deps, 4);
    // Phase 1: A, Phase 2: B+C, Phase 3: D
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]).toEqual(["A"]);
    expect(result.groups[1].sort()).toEqual(["B", "C"]);
    expect(result.groups[2]).toEqual(["D"]);
  });

  test("throws on cycle", () => {
    const modules = [mod("A"), mod("B")];
    const deps: DependencyEdge[] = [
      { from: "A", to: "B", type: "completion" },
      { from: "B", to: "A", type: "completion" },
    ];

    expect(() => buildSchedule(modules, deps, 4)).toThrow(/cycle/i);
  });

  test("computes critical path", () => {
    const modules = [mod("A", 5), mod("B", 10), mod("C", 3), mod("D", 5)];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "A", type: "completion" },
      { from: "D", to: "B", type: "completion" },
      { from: "D", to: "C", type: "completion" },
    ];

    const result = buildSchedule(modules, deps, 4);
    // Critical path: A -> B -> D (5+10+5=20) beats A -> C -> D (5+3+5=13)
    expect(result.criticalPath).toEqual(["A", "B", "D"]);
  });

  test("estimates duration from parallel phases", () => {
    const modules = [mod("A", 5), mod("B", 10), mod("C", 3)];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "A", type: "completion" },
    ];

    const result = buildSchedule(modules, deps, 4);
    // Phase 1: A=5min, Phase 2: max(B=10, C=3)=10min → total 15
    expect(result.estimatedDurationMin).toBe(15);
  });
});

describe("getReadyModules", () => {
  test("returns modules with all deps satisfied", () => {
    const modules = [mod("A"), mod("B"), mod("C")];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "B", type: "completion" },
    ];

    expect(getReadyModules(modules, deps, new Set())).toEqual(["A"]);
    expect(getReadyModules(modules, deps, new Set(["A"]))).toEqual(["B"]);
    expect(getReadyModules(modules, deps, new Set(["A", "B"]))).toEqual(["C"]);
  });

  test("returns multiple ready modules", () => {
    const modules = [mod("A"), mod("B"), mod("C")];
    const deps: DependencyEdge[] = [
      { from: "B", to: "A", type: "completion" },
      { from: "C", to: "A", type: "completion" },
    ];

    const ready = getReadyModules(modules, deps, new Set(["A"]));
    expect(ready.sort()).toEqual(["B", "C"]);
  });

  test("excludes already completed modules", () => {
    const modules = [mod("A"), mod("B")];
    const deps: DependencyEdge[] = [];

    expect(getReadyModules(modules, deps, new Set(["A"]))).toEqual(["B"]);
    expect(getReadyModules(modules, deps, new Set(["A", "B"]))).toEqual([]);
  });
});
