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
};
