export type AgentRole =
  | "orchestrator"
  | "architect"
  | "builder"
  | "evaluator"
  | "merger"
  | "integration-tester";

export type AgentStatus =
  | "pending"
  | "spawning"
  | "running"
  | "paused"
  | "blocked"
  | "completed"
  | "failed"
  | "killed"
  | "incomplete";

export interface AgentRecord {
  id: string;
  run_id: string;
  role: AgentRole;
  name: string;
  status: AgentStatus;
  pid: number | null;
  module_id: string | null;
  buildplan_id: string | null;
  worktree_path: string | null;
  branch_name: string | null;
  session_id: string | null;
  system_prompt: string | null;
  tdd_phase: string | null;
  tdd_cycles: number;
  cost_usd: number;
  tokens_used: number;
  queue_wait_ms: number;
  total_active_ms: number;
  last_heartbeat: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentSpawnConfig {
  agent_id: string;
  run_id: string;
  role: AgentRole;
  name: string;
  module_id?: string;
  buildplan_id?: string;
  worktree_path?: string;
  system_prompt: string;
  resume_session_id?: string;
}

export interface AgentHandle {
  id: string;
  pid: number;
  role: AgentRole;
  kill: () => Promise<void>;
  /** Resolves when the process exits with the parsed JSON result (if --output-format json) */
  result?: Promise<ClaudeResult | null>;
}

/** Parsed result from claude --print --output-format json */
export interface ClaudeResult {
  subtype: "success" | "error_max_turns" | "error_during_execution" | "error_max_budget_usd";
  session_id: string;
  is_error: boolean;
  num_turns: number;
  total_cost_usd: number;
  duration_ms: number;
  result?: string;
}

export interface AgentMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
}
