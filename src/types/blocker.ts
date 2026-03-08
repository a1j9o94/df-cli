export type BlockerType = "secret" | "access" | "decision" | "resource";
export type BlockerStatus = "pending" | "resolved";

export interface BlockerRecord {
  id: string;
  run_id: string;
  agent_id: string;
  module_id: string | null;
  type: BlockerType;
  description: string;
  status: BlockerStatus;
  resolved_value: string | null; // encrypted for secrets, plain for others
  resolved_by: string | null; // "cli" or "dashboard"
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockerResolution {
  value?: string;
  file_path?: string;
  env_key?: string;
  env_value?: string;
}
