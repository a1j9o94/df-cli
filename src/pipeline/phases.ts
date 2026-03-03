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

export function getNextPhase(current: PhaseName): PhaseName | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

export function shouldSkipPhase(phase: PhaseName, context: Record<string, unknown>): boolean {
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
