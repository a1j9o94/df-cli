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
  | "completed"
  | "failed"
  | "killed";

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
  run_id: string;
  role: AgentRole;
  name: string;
  module_id?: string;
  buildplan_id?: string;
  worktree_path?: string;
  system_prompt: string;
}

export interface AgentHandle {
  id: string;
  pid: number;
  role: AgentRole;
  kill: () => Promise<void>;
}

export interface AgentMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
}
