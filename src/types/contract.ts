export interface ContractRecord {
  id: string;
  run_id: string;
  buildplan_id: string;
  name: string;
  description: string;
  format: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ContractBindingRecord {
  id: string;
  contract_id: string;
  agent_id: string;
  module_id: string;
  role: "implementer" | "consumer";
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface BuilderDependencyRecord {
  id: string;
  run_id: string;
  builder_id: string;
  depends_on_builder_id: string | null;
  depends_on_module_id: string;
  dependency_type: "completion" | "contract" | "artifact";
  satisfied: boolean;
  satisfied_at: string | null;
  created_at: string;
}
