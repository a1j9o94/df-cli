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
  resolved_value: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockerCreateInput {
  run_id: string;
  agent_id: string;
  module_id?: string;
  type: BlockerType;
  description: string;
}

export interface BlockerResolution {
  value?: string;
  file_path?: string;
  env_key?: string;
  env_value?: string;
}
