import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { findDfDir } from "../utils/config.js";

export type PhaseName =
  | "scout"
  | "architect"
  | "plan-review"
  | "build"
  | "integrate"
  | "evaluate-functional"
  | "evaluate-change"
  | "merge";

export interface PhaseDefinition {
  id: PhaseName;
  agent: string;
  description: string;
  skip_when?: string;
  gate: {
    type: "artifact" | "decision" | "threshold" | "compound";
    [key: string]: unknown;
  };
  timeout_min?: number;
  on_fail?: {
    action: string;
    next?: string;
  };
}

export interface PipelineDefinition {
  name: string;
  version: number;
  phases: PhaseDefinition[];
  iteration?: {
    max_iterations: number;
    iteration_trigger: string;
    iteration_target: string;
  };
}

export const PHASE_ORDER: PhaseName[] = [
  "scout",
  "architect",
  "plan-review",
  "build",
  "integrate",
  "evaluate-functional",
  "evaluate-change",
  "merge",
];

/**
 * Load pipeline definition from .df/pipeline.yaml.
 * Returns null if the file doesn't exist.
 */
export function loadPipelineDefinition(dfDir?: string): PipelineDefinition | null {
  const dir = dfDir ?? findDfDir();
  if (!dir) return null;

  const pipelinePath = join(dir, "pipeline.yaml");
  if (!existsSync(pipelinePath)) return null;

  const raw = readFileSync(pipelinePath, "utf-8");
  const parsed = parseYaml(raw) as PipelineDefinition;

  if (!parsed?.phases || !Array.isArray(parsed.phases)) return null;

  return parsed;
}

/**
 * Get phase definitions from pipeline.yaml, falling back to PHASE_ORDER.
 */
export function getPhaseDefinitions(dfDir?: string): PhaseDefinition[] | null {
  const pipeline = loadPipelineDefinition(dfDir);
  return pipeline?.phases ?? null;
}

/**
 * Look up a single phase definition by name.
 */
export function getPhaseDefinition(phase: PhaseName, definitions: PhaseDefinition[]): PhaseDefinition | undefined {
  return definitions.find((d) => d.id === phase);
}

/**
 * Evaluate a skip_when expression against the pipeline context.
 *
 * Supported expressions (from pipeline.yaml):
 *   "run.config.skip_architect == true"
 *   "run.skip_change_eval == true"
 *   "buildplan.modules.length <= 1"
 */
export function evaluateSkipWhen(expression: string, context: Record<string, unknown>): boolean {
  const trimmed = expression.trim();

  // Pattern: "X == true" or "X == false"
  const eqBool = trimmed.match(/^(.+?)\s*==\s*(true|false)$/);
  if (eqBool) {
    const value = resolveContextPath(eqBool[1].trim(), context);
    return value === (eqBool[2] === "true");
  }

  // Pattern: "X <= N" or "X < N" or "X >= N" or "X > N"
  const cmp = trimmed.match(/^(.+?)\s*(<=|<|>=|>)\s*(\d+)$/);
  if (cmp) {
    const value = resolveContextPath(cmp[1].trim(), context);
    const num = Number(value) || 0;
    const threshold = Number(cmp[3]);
    switch (cmp[2]) {
      case "<=": return num <= threshold;
      case "<": return num < threshold;
      case ">=": return num >= threshold;
      case ">": return num > threshold;
    }
  }

  return false;
}

/**
 * Resolve a dotted path like "run.config.skip_architect" or "buildplan.modules.length"
 * against the flattened context map the engine provides.
 *
 * Context keys use flat names: skip_architect, skip_change_eval, module_count.
 * We map known pipeline.yaml paths to these context keys.
 */
function resolveContextPath(path: string, context: Record<string, unknown>): unknown {
  // Direct context key match
  if (path in context) return context[path];

  // Map well-known pipeline.yaml expression paths to context keys
  const pathMap: Record<string, string> = {
    "run.config.skip_architect": "skip_architect",
    "run.skip_change_eval": "skip_change_eval",
    "buildplan.modules.length": "module_count",
  };

  const mapped = pathMap[path];
  if (mapped && mapped in context) return context[mapped];

  return undefined;
}

export function getNextPhase(current: PhaseName): PhaseName | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/**
 * Determine whether a phase should be skipped.
 * If phase definitions are provided, evaluates the declarative skip_when expression.
 * Falls back to hardcoded logic for backwards compatibility when no definitions are loaded.
 */
export function shouldSkipPhase(
  phase: PhaseName,
  context: Record<string, unknown>,
  definitions?: PhaseDefinition[],
): boolean {
  if (definitions) {
    const def = getPhaseDefinition(phase, definitions);
    if (def?.skip_when) {
      return evaluateSkipWhen(def.skip_when, context);
    }
    // Phase exists in definitions but has no skip_when → never skip
    if (def) return false;
  }

  // Fallback: hardcoded logic (backwards compatibility when no pipeline.yaml)
  const skipArchitect = context.skip_architect === true;
  const moduleCount = (context.module_count as number) ?? 0;
  const skipChangeEval = context.skip_change_eval === true;

  switch (phase) {
    case "architect":
      return skipArchitect;
    case "plan-review":
      return skipArchitect;
    case "integrate":
      return moduleCount <= 1;
    case "evaluate-change":
      return skipChangeEval;
    default:
      return false;
  }
}
