/** Per-role cost override configuration */
export interface CostRoleOverride {
  cost_per_minute?: number;
  tokens_per_minute?: number;
}

/** Cost estimation configuration */
export interface CostConfig {
  /** Display name for the model (e.g., "sonnet", "opus", "haiku") */
  model: string;
  /** Cost per million input tokens */
  input_cost_per_mtok: number;
  /** Cost per million output tokens */
  output_cost_per_mtok: number;
  /** Cost per million cached input tokens */
  cache_read_cost_per_mtok: number;
  /** Elapsed-time estimation fallback: $/min when no token data */
  cost_per_minute: number;
  /** Estimated tokens/min for elapsed-time fallback */
  tokens_per_minute: number;
  /** Optional preset profile shorthand (overridden by explicit fields) */
  profile?: string;
  /** Optional per-role overrides */
  roles?: Record<string, CostRoleOverride>;
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  model: "sonnet",
  input_cost_per_mtok: 3.0,
  output_cost_per_mtok: 15.0,
  cache_read_cost_per_mtok: 0.3,
  cost_per_minute: 0.05,
  tokens_per_minute: 4000,
};

export interface DfConfig {
  project: {
    name: string;
    root: string;
    branch: string;
  };
  build: {
    default_mode: "quick" | "thorough";
    max_parallel: number;
    budget_usd: number;
    max_iterations: number;
    /** Cost per minute for time-based agent cost estimation. Default: 0.05 */
    cost_per_minute: number;
  };
  runtime: {
    agent_binary: string;
    heartbeat_interval_ms: number;
    heartbeat_timeout_ms: number;
    max_agent_lifetime_ms: number;
  };
  thresholds: {
    satisfaction: number;
    changeability: number;
  };
  resources: {
    max_worktrees: number;
    max_api_slots: number;
  };
  cost: CostConfig;
}

export const DEFAULT_CONFIG: DfConfig = {
  project: {
    name: "",
    root: ".",
    branch: "main",
  },
  build: {
    default_mode: "thorough",
    max_parallel: 4,
    budget_usd: 50.0,
    max_iterations: 3,
    cost_per_minute: 0.05,
  },
  runtime: {
    agent_binary: "claude",
    heartbeat_interval_ms: 30_000,
    heartbeat_timeout_ms: 90_000,
    max_agent_lifetime_ms: 2_700_000,
  },
  thresholds: {
    satisfaction: 0.8,
    changeability: 0.6,
  },
  resources: {
    max_worktrees: 6,
    max_api_slots: 4,
  },
  cost: { ...DEFAULT_COST_CONFIG },
};
