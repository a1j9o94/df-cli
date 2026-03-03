export type SpecStatus = "draft" | "ready" | "building" | "completed" | "archived";

export interface SpecRecord {
  id: string;
  title: string;
  status: SpecStatus;
  file_path: string;
  content_hash: string;
  parent_spec_id: string | null;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface SpecFrontmatter {
  id: string;
  title: string;
  type: string;
  status: SpecStatus;
  version: string;
  priority: string;
  parent_spec_id?: string;
  scenarios?: number;
}
