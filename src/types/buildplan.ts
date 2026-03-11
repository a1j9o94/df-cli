export interface ModuleDefinition {
  id: string;
  title: string;
  description: string;
  scope: {
    creates: string[];
    modifies: string[];
    test_files: string[];
  };
  estimated_complexity: "low" | "medium" | "high";
  estimated_tokens: number;
  estimated_duration_min: number;
  /** For workspace builds: which project this module targets. */
  targetProject?: string;
}

export interface ContractDefinition {
  name: string;
  description: string;
  format: string;
  content: string;
  bound_modules: string[];
  binding_roles: Record<string, "implementer" | "consumer">;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "completion" | "contract" | "artifact";
  contract?: string;
  artifact?: string;
}

export interface ParallelGroup {
  phase: number;
  modules: string[];
}

export interface IntegrationCheckpoint {
  after_phase: number;
  test: string;
  modules_involved: string[];
}

export interface BuildplanRisk {
  description: string;
  mitigation: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

export interface Buildplan {
  spec_id: string;
  modules: ModuleDefinition[];
  contracts: ContractDefinition[];
  dependencies: DependencyEdge[];
  parallelism: {
    max_concurrent: number;
    parallel_groups: ParallelGroup[];
    critical_path: string[];
    critical_path_estimated_min: number;
  };
  integration_strategy: {
    checkpoints: IntegrationCheckpoint[];
    final_integration: string;
  };
  risks: BuildplanRisk[];
  total_estimated_tokens: number;
  total_estimated_cost_usd: number;
  total_estimated_duration_min: number;
}

export type BuildplanStatus = "draft" | "active" | "superseded" | "rejected";

export interface BuildplanRecord {
  id: string;
  run_id: string;
  spec_id: string;
  architect_agent_id: string;
  version: number;
  status: BuildplanStatus;
  plan: string;
  module_count: number;
  contract_count: number;
  max_parallel: number;
  critical_path_modules: string | null;
  estimated_duration_min: number | null;
  estimated_cost_usd: number | null;
  estimated_tokens: number | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}
