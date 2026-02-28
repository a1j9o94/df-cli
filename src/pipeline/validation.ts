import type { Buildplan } from "../types/index.js";
import { detectCycles } from "./scheduler.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a buildplan JSON structure.
 * Checks: required fields, module IDs unique, dependencies reference valid modules,
 * no cycles, contracts have content, estimates present.
 */
export function validateBuildplan(planJson: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let plan: Buildplan;
  try {
    plan = JSON.parse(planJson);
  } catch {
    return { valid: false, errors: ["Invalid JSON"], warnings: [] };
  }

  // Required top-level fields
  if (!plan.modules || !Array.isArray(plan.modules)) {
    errors.push("Missing or invalid 'modules' array");
  }
  if (!plan.contracts || !Array.isArray(plan.contracts)) {
    errors.push("Missing or invalid 'contracts' array");
  }
  if (!plan.dependencies || !Array.isArray(plan.dependencies)) {
    errors.push("Missing or invalid 'dependencies' array");
  }
  if (!plan.parallelism) {
    errors.push("Missing 'parallelism' object");
  }
  if (!plan.integration_strategy) {
    errors.push("Missing 'integration_strategy' object");
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Module IDs must be unique
  const moduleIds = new Set<string>();
  for (const mod of plan.modules) {
    if (!mod.id) {
      errors.push("Module missing 'id' field");
      continue;
    }
    if (moduleIds.has(mod.id)) {
      errors.push(`Duplicate module ID: ${mod.id}`);
    }
    moduleIds.add(mod.id);

    if (!mod.title) warnings.push(`Module ${mod.id} missing 'title'`);
    if (mod.estimated_tokens == null) warnings.push(`Module ${mod.id} missing 'estimated_tokens'`);
    if (mod.estimated_duration_min == null) warnings.push(`Module ${mod.id} missing 'estimated_duration_min'`);
  }

  // Dependencies must reference valid module IDs
  for (const dep of plan.dependencies) {
    if (!moduleIds.has(dep.from)) {
      errors.push(`Dependency references unknown module: ${dep.from}`);
    }
    if (!moduleIds.has(dep.to)) {
      errors.push(`Dependency references unknown module: ${dep.to}`);
    }
  }

  // No cycles
  const cycles = detectCycles(plan.dependencies);
  if (cycles.length > 0) {
    errors.push(`Dependency cycle detected: ${cycles[0].join(" -> ")}`);
  }

  // Contracts must have content
  for (const contract of plan.contracts) {
    if (!contract.name) {
      errors.push("Contract missing 'name'");
    }
    if (!contract.content) {
      errors.push(`Contract '${contract.name || "unnamed"}' missing 'content'`);
    }
    if (contract.bound_modules) {
      for (const modId of contract.bound_modules) {
        if (!moduleIds.has(modId)) {
          errors.push(`Contract '${contract.name}' references unknown module: ${modId}`);
        }
      }
    }
  }

  // Estimates
  if (plan.total_estimated_tokens == null) warnings.push("Missing 'total_estimated_tokens'");
  if (plan.total_estimated_cost_usd == null) warnings.push("Missing 'total_estimated_cost_usd'");
  if (plan.total_estimated_duration_min == null) warnings.push("Missing 'total_estimated_duration_min'");

  return { valid: errors.length === 0, errors, warnings };
}
