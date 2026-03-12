import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";

import {
  evaluateSkipWhen,
  loadPipelineDefinition,
  getPhaseDefinitions,
  getPhaseDefinition,
  shouldSkipPhase,
  PHASE_ORDER,
} from "../../../src/pipeline/phases.js";
import type { PhaseDefinition, PipelineDefinition } from "../../../src/pipeline/phases.js";

// --- evaluateSkipWhen ---

describe("evaluateSkipWhen", () => {
  test("evaluates 'X == true' with matching context", () => {
    expect(evaluateSkipWhen("run.config.skip_architect == true", { skip_architect: true })).toBe(true);
    expect(evaluateSkipWhen("run.config.skip_architect == true", { skip_architect: false })).toBe(false);
  });

  test("evaluates 'X == false'", () => {
    expect(evaluateSkipWhen("run.config.skip_architect == false", { skip_architect: false })).toBe(true);
    expect(evaluateSkipWhen("run.config.skip_architect == false", { skip_architect: true })).toBe(false);
  });

  test("evaluates 'X == true' for skip_change_eval", () => {
    expect(evaluateSkipWhen("run.skip_change_eval == true", { skip_change_eval: true })).toBe(true);
    expect(evaluateSkipWhen("run.skip_change_eval == true", { skip_change_eval: false })).toBe(false);
  });

  test("evaluates 'X <= N' comparisons", () => {
    expect(evaluateSkipWhen("buildplan.modules.length <= 1", { module_count: 1 })).toBe(true);
    expect(evaluateSkipWhen("buildplan.modules.length <= 1", { module_count: 0 })).toBe(true);
    expect(evaluateSkipWhen("buildplan.modules.length <= 1", { module_count: 3 })).toBe(false);
  });

  test("evaluates 'X < N' comparisons", () => {
    expect(evaluateSkipWhen("buildplan.modules.length < 2", { module_count: 1 })).toBe(true);
    expect(evaluateSkipWhen("buildplan.modules.length < 2", { module_count: 2 })).toBe(false);
  });

  test("evaluates 'X >= N' comparisons", () => {
    expect(evaluateSkipWhen("buildplan.modules.length >= 3", { module_count: 3 })).toBe(true);
    expect(evaluateSkipWhen("buildplan.modules.length >= 3", { module_count: 2 })).toBe(false);
  });

  test("evaluates 'X > N' comparisons", () => {
    expect(evaluateSkipWhen("buildplan.modules.length > 1", { module_count: 2 })).toBe(true);
    expect(evaluateSkipWhen("buildplan.modules.length > 1", { module_count: 1 })).toBe(false);
  });

  test("returns false for unrecognized expressions", () => {
    expect(evaluateSkipWhen("some.unknown.thing", {})).toBe(false);
  });

  test("returns false when context key is missing", () => {
    expect(evaluateSkipWhen("run.config.skip_architect == true", {})).toBe(false);
  });

  test("handles direct context keys", () => {
    expect(evaluateSkipWhen("skip_architect == true", { skip_architect: true })).toBe(true);
  });

  test("defaults missing numeric values to 0", () => {
    expect(evaluateSkipWhen("buildplan.modules.length <= 1", {})).toBe(true);
  });
});

// --- shouldSkipPhase with definitions ---

describe("shouldSkipPhase with phase definitions", () => {
  const definitions: PhaseDefinition[] = [
    {
      id: "scout",
      agent: "orchestrator",
      description: "Scout",
      gate: { type: "artifact" },
    },
    {
      id: "architect",
      agent: "architect",
      description: "Architect",
      skip_when: "run.config.skip_architect == true",
      gate: { type: "artifact" },
      timeout_min: 10,
    },
    {
      id: "plan-review",
      agent: "orchestrator",
      description: "Plan review",
      gate: { type: "decision" },
    },
    {
      id: "build",
      agent: "builder",
      description: "Build",
      gate: { type: "compound" },
    },
    {
      id: "integrate",
      agent: "integration-tester",
      description: "Integrate",
      skip_when: "buildplan.modules.length <= 1",
      gate: { type: "compound" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "evaluate-functional",
      agent: "evaluator",
      description: "Eval functional",
      gate: { type: "threshold" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "evaluate-change",
      agent: "evaluator",
      description: "Eval change",
      skip_when: "run.skip_change_eval == true",
      gate: { type: "threshold" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "merge",
      agent: "merger",
      description: "Merge",
      gate: { type: "compound" },
    },
  ];

  test("uses skip_when from definitions for architect", () => {
    expect(shouldSkipPhase("architect", { skip_architect: true }, definitions)).toBe(true);
    expect(shouldSkipPhase("architect", { skip_architect: false }, definitions)).toBe(false);
  });

  test("uses skip_when from definitions for integrate", () => {
    expect(shouldSkipPhase("integrate", { module_count: 1 }, definitions)).toBe(true);
    expect(shouldSkipPhase("integrate", { module_count: 3 }, definitions)).toBe(false);
  });

  test("uses skip_when from definitions for evaluate-change", () => {
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: true }, definitions)).toBe(true);
    expect(shouldSkipPhase("evaluate-change", { skip_change_eval: false }, definitions)).toBe(false);
  });

  test("never skips phases without skip_when in definitions", () => {
    expect(shouldSkipPhase("scout", {}, definitions)).toBe(false);
    expect(shouldSkipPhase("build", {}, definitions)).toBe(false);
    expect(shouldSkipPhase("merge", {}, definitions)).toBe(false);
    expect(shouldSkipPhase("evaluate-functional", {}, definitions)).toBe(false);
  });

  test("plan-review has no skip_when so never skips via definitions", () => {
    // Unlike the hardcoded fallback which ties plan-review to skip_architect,
    // the definition-based approach only skips if the definition has skip_when
    expect(shouldSkipPhase("plan-review", { skip_architect: true }, definitions)).toBe(false);
  });

  test("falls back to hardcoded logic when no definitions provided", () => {
    expect(shouldSkipPhase("architect", { skip_architect: true })).toBe(true);
    expect(shouldSkipPhase("plan-review", { skip_architect: true })).toBe(true);
    expect(shouldSkipPhase("integrate", { module_count: 1 })).toBe(true);
  });
});

// --- getPhaseDefinition ---

describe("getPhaseDefinition", () => {
  const definitions: PhaseDefinition[] = [
    { id: "scout", agent: "orchestrator", description: "Scout", gate: { type: "artifact" } },
    { id: "build", agent: "builder", description: "Build", gate: { type: "compound" }, timeout_min: 30 },
    { id: "integrate", agent: "integration-tester", description: "Integrate", gate: { type: "compound" }, on_fail: { action: "retry", next: "build" } },
  ];

  test("returns matching definition", () => {
    const def = getPhaseDefinition("build", definitions);
    expect(def).toBeDefined();
    expect(def!.timeout_min).toBe(30);
    expect(def!.agent).toBe("builder");
  });

  test("returns undefined for missing phase", () => {
    const def = getPhaseDefinition("merge", definitions);
    expect(def).toBeUndefined();
  });

  test("returns on_fail from definition", () => {
    const def = getPhaseDefinition("integrate", definitions);
    expect(def?.on_fail).toEqual({ action: "retry", next: "build" });
  });
});

// --- loadPipelineDefinition ---

describe("loadPipelineDefinition", () => {
  const tmpDir = join("/tmp", `phase-def-test-${Date.now()}`);
  const dfDir = join(tmpDir, ".df");

  beforeEach(() => {
    mkdirSync(dfDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true });
    }
  });

  test("loads pipeline definition from pipeline.yaml", () => {
    const pipeline: PipelineDefinition = {
      name: "test-pipeline",
      version: 2,
      phases: [
        {
          id: "scout",
          agent: "orchestrator",
          description: "Scout phase",
          gate: { type: "artifact", artifact: "context summary" },
        },
        {
          id: "architect",
          agent: "architect",
          description: "Architect phase",
          skip_when: "run.config.skip_architect == true",
          gate: { type: "artifact" },
          timeout_min: 10,
        },
      ],
      iteration: {
        max_iterations: 3,
        iteration_trigger: "evaluate-functional.on_fail",
        iteration_target: "build",
      },
    };

    writeFileSync(join(dfDir, "pipeline.yaml"), yamlStringify(pipeline));

    const loaded = loadPipelineDefinition(dfDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe("test-pipeline");
    expect(loaded!.version).toBe(2);
    expect(loaded!.phases).toHaveLength(2);
    expect(loaded!.phases[0].id).toBe("scout");
    expect(loaded!.phases[1].timeout_min).toBe(10);
    expect(loaded!.phases[1].skip_when).toBe("run.config.skip_architect == true");
    expect(loaded!.iteration?.max_iterations).toBe(3);
  });

  test("returns null when pipeline.yaml does not exist", () => {
    const result = loadPipelineDefinition(dfDir);
    expect(result).toBeNull();
  });

  test("returns null for invalid directory", () => {
    const result = loadPipelineDefinition("/nonexistent/dir");
    expect(result).toBeNull();
  });

  test("returns null for malformed yaml without phases array", () => {
    writeFileSync(join(dfDir, "pipeline.yaml"), yamlStringify({ name: "bad", version: 1 }));
    const result = loadPipelineDefinition(dfDir);
    expect(result).toBeNull();
  });

  test("loads on_fail properties from pipeline.yaml", () => {
    const pipeline: PipelineDefinition = {
      name: "test",
      version: 2,
      phases: [
        {
          id: "integrate",
          agent: "integration-tester",
          description: "Integrate",
          gate: { type: "compound" },
          on_fail: { action: "retry", next: "build" },
        },
        {
          id: "evaluate-functional",
          agent: "evaluator",
          description: "Eval",
          gate: { type: "threshold" },
          on_fail: { action: "retry", next: "build" },
        },
      ],
    };

    writeFileSync(join(dfDir, "pipeline.yaml"), yamlStringify(pipeline));

    const loaded = loadPipelineDefinition(dfDir);
    expect(loaded!.phases[0].on_fail).toEqual({ action: "retry", next: "build" });
    expect(loaded!.phases[1].on_fail).toEqual({ action: "retry", next: "build" });
  });
});

// --- getPhaseDefinitions ---

describe("getPhaseDefinitions", () => {
  const tmpDir = join("/tmp", `phase-defs-test-${Date.now()}`);
  const dfDir = join(tmpDir, ".df");

  beforeEach(() => {
    mkdirSync(dfDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true });
    }
  });

  test("returns phase definitions from pipeline.yaml", () => {
    const pipeline = {
      name: "test",
      version: 2,
      phases: [
        { id: "scout", agent: "orchestrator", description: "Scout", gate: { type: "artifact" } },
      ],
    };
    writeFileSync(join(dfDir, "pipeline.yaml"), yamlStringify(pipeline));

    const defs = getPhaseDefinitions(dfDir);
    expect(defs).not.toBeNull();
    expect(defs!).toHaveLength(1);
    expect(defs![0].id).toBe("scout");
  });

  test("returns null when no pipeline.yaml", () => {
    expect(getPhaseDefinitions(dfDir)).toBeNull();
  });
});

// --- Phase timeout integration ---

describe("phase definition timeout_min", () => {
  test("architect definition includes timeout_min", () => {
    const definitions: PhaseDefinition[] = [
      {
        id: "architect",
        agent: "architect",
        description: "Architect",
        gate: { type: "artifact" },
        timeout_min: 10,
      },
    ];

    const def = getPhaseDefinition("architect", definitions);
    expect(def?.timeout_min).toBe(10);
  });

  test("phases without timeout_min return undefined", () => {
    const definitions: PhaseDefinition[] = [
      {
        id: "scout",
        agent: "orchestrator",
        description: "Scout",
        gate: { type: "artifact" },
      },
    ];

    const def = getPhaseDefinition("scout", definitions);
    expect(def?.timeout_min).toBeUndefined();
  });
});

// --- Phase on_fail routing ---

describe("phase definition on_fail", () => {
  const definitions: PhaseDefinition[] = [
    {
      id: "integrate",
      agent: "integration-tester",
      description: "Integrate",
      gate: { type: "compound" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "evaluate-functional",
      agent: "evaluator",
      description: "Eval",
      gate: { type: "threshold" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "evaluate-change",
      agent: "evaluator",
      description: "Eval change",
      gate: { type: "threshold" },
      on_fail: { action: "retry", next: "build" },
    },
    {
      id: "build",
      agent: "builder",
      description: "Build",
      gate: { type: "compound" },
      // No on_fail → failure is fatal
    },
  ];

  test("integrate has retry on_fail", () => {
    const def = getPhaseDefinition("integrate", definitions);
    expect(def?.on_fail?.action).toBe("retry");
    expect(def?.on_fail?.next).toBe("build");
  });

  test("evaluate-functional has retry on_fail", () => {
    const def = getPhaseDefinition("evaluate-functional", definitions);
    expect(def?.on_fail?.action).toBe("retry");
  });

  test("evaluate-change has retry on_fail", () => {
    const def = getPhaseDefinition("evaluate-change", definitions);
    expect(def?.on_fail?.action).toBe("retry");
  });

  test("build has no on_fail (failure is fatal)", () => {
    const def = getPhaseDefinition("build", definitions);
    expect(def?.on_fail).toBeUndefined();
  });
});

// --- PHASE_ORDER consistency ---

describe("PHASE_ORDER matches expected phases", () => {
  test("contains all 8 phases in order", () => {
    expect(PHASE_ORDER).toEqual([
      "scout",
      "architect",
      "plan-review",
      "build",
      "integrate",
      "evaluate-functional",
      "evaluate-change",
      "merge",
    ]);
  });
});
