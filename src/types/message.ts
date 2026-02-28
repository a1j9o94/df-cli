export interface MessageRecord {
  id: string;
  run_id: string;
  from_agent_id: string;
  to_agent_id: string | null;
  to_role: string | null;
  to_contract_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
}
