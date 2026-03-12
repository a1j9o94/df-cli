/**
 * Config validation with field-level error messages.
 *
 * Validates partial config objects (as received from API updates).
 * Only validates fields that are present in the input.
 */

export interface ValidationError {
  field: string;
  message: string;
}

type PartialConfig = Record<string, unknown>;

interface ValidationRule {
  field: string;
  validate: (value: unknown) => string | null;
}

const RULES: ValidationRule[] = [
  {
    field: "build.max_parallel",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 1) return "Max parallel must be at least 1";
      if (v > 16) return "Max parallel must be at most 16";
      return null;
    },
  },
  {
    field: "build.budget_usd",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v <= 0) return "Budget must be positive";
      return null;
    },
  },
  {
    field: "build.max_iterations",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 1) return "Max iterations must be at least 1";
      if (v > 10) return "Max iterations must be at most 10";
      return null;
    },
  },
  {
    field: "build.max_module_retries",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 0) return "Max module retries must be at least 0";
      if (v > 5) return "Max module retries must be at most 5";
      return null;
    },
  },
  {
    field: "build.cost_per_minute",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v <= 0) return "Cost per minute must be positive";
      return null;
    },
  },
  {
    field: "thresholds.satisfaction",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 0) return "Satisfaction must be at least 0";
      if (v > 1) return "Satisfaction must be at most 1.0";
      return null;
    },
  },
  {
    field: "thresholds.changeability",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 0) return "Changeability must be at least 0";
      if (v > 1) return "Changeability must be at most 1.0";
      return null;
    },
  },
  {
    field: "runtime.heartbeat_timeout_ms",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v <= 0) return "Heartbeat timeout must be positive";
      return null;
    },
  },
  {
    field: "runtime.max_agent_lifetime_ms",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v <= 0) return "Max agent lifetime must be positive";
      return null;
    },
  },
  {
    field: "runtime.stale_agent_max_strikes",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 1) return "Stale agent max strikes must be at least 1";
      if (v > 20) return "Stale agent max strikes must be at most 20";
      return null;
    },
  },
  {
    field: "resources.max_worktrees",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 1) return "Max worktrees must be at least 1";
      return null;
    },
  },
  {
    field: "resources.max_api_slots",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < 1) return "Max API slots must be at least 1";
      return null;
    },
  },
];

function getNestedValue(obj: PartialConfig, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function validateConfig(partial: PartialConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of RULES) {
    const value = getNestedValue(partial, rule.field);
    if (value === undefined) continue;

    const message = rule.validate(value);
    if (message) {
      errors.push({ field: rule.field, message });
    }
  }

  return errors;
}
