export type RunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type PauseReason = "budget_exceeded" | "manual" | "blocked" | "plan_review";

export interface RunRecord {
  id: string;
  spec_id: string;
  status: RunStatus;
  skip_change_eval: boolean;
  max_parallel: number;
  budget_usd: number;
  cost_usd: number;
  tokens_used: number;
  current_phase: string | null;
  iteration: number;
  max_iterations: number;
  config: string;
  error: string | null;
  paused_at: string | null;
  pause_reason: PauseReason | null;
  created_at: string;
  updated_at: string;
}

export interface RunCreateInput {
  spec_id: string;
  skip_change_eval?: boolean;
  max_parallel?: number;
  budget_usd?: number;
  max_iterations?: number;
}
