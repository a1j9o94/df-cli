import type { CostConfig } from "../types/config.js";
import { DEFAULT_COST_CONFIG } from "../types/config.js";

/**
 * Preset cost profiles for common Anthropic models.
 * Each profile defines full CostConfig values.
 * Adding a new profile requires only adding an entry here.
 */
const COST_PROFILES: Record<string, CostConfig> = {
  sonnet: {
    model: "sonnet",
    input_cost_per_mtok: 3.0,
    output_cost_per_mtok: 15.0,
    cache_read_cost_per_mtok: 0.3,
    cost_per_minute: 0.05,
    tokens_per_minute: 4000,
  },
  opus: {
    model: "opus",
    input_cost_per_mtok: 15.0,
    output_cost_per_mtok: 75.0,
    cache_read_cost_per_mtok: 1.5,
    cost_per_minute: 0.20,
    tokens_per_minute: 3000,
  },
  haiku: {
    model: "haiku",
    input_cost_per_mtok: 0.25,
    output_cost_per_mtok: 1.25,
    cache_read_cost_per_mtok: 0.025,
    cost_per_minute: 0.01,
    tokens_per_minute: 8000,
  },
};

/**
 * Resolve a cost profile name to a full CostConfig.
 * Returns sonnet defaults for unknown or 'custom' profiles.
 *
 * Contract: CostResolutionFunctions.resolveCostProfile
 */
export function resolveCostProfile(profile: string): CostConfig {
  return COST_PROFILES[profile] ?? { ...DEFAULT_COST_CONFIG };
}

/**
 * Get the cost per minute for a given role, falling back to the config default.
 * Looks up role-specific override first, then falls back to config.cost_per_minute.
 *
 * Contract: CostResolutionFunctions.getCostPerMinute
 */
export function getCostPerMinute(config: CostConfig, role?: string): number {
  if (role && config.roles?.[role]?.cost_per_minute !== undefined) {
    return config.roles[role].cost_per_minute!;
  }
  return config.cost_per_minute;
}

/**
 * Get the tokens per minute for a given role, falling back to the config default.
 * Looks up role-specific override first, then falls back to config.tokens_per_minute.
 *
 * Contract: CostResolutionFunctions.getTokensPerMinute
 */
export function getTokensPerMinute(config: CostConfig, role?: string): number {
  if (role && config.roles?.[role]?.tokens_per_minute !== undefined) {
    return config.roles[role].tokens_per_minute!;
  }
  return config.tokens_per_minute;
}

/**
 * Expose the profiles map for extensibility checks.
 */
export { COST_PROFILES };
