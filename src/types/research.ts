export type ResearchArtifactType = "text" | "file";

export interface ResearchArtifactRecord {
  id: string;
  run_id: string;
  agent_id: string;
  label: string;
  type: ResearchArtifactType;
  content: string | null;
  file_path: string | null;
  module_id: string | null;
  created_at: string;
}

export interface ResearchArtifactCreateInput {
  run_id: string;
  agent_id: string;
  label: string;
  type: ResearchArtifactType;
  content?: string;
  file_path?: string;
  module_id?: string;
}
