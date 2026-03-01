export type EventType =
  | "run-created"
  | "run-started"
  | "run-completed"
  | "run-failed"
  | "run-resumed"
  | "run-cancelled"
  | "run-resumed"
  | "phase-started"
  | "phase-completed"
  | "phase-failed"
  | "agent-spawned"
  | "agent-heartbeat"
  | "agent-completed"
  | "agent-failed"
  | "agent-killed"
  | "buildplan-submitted"
  | "buildplan-approved"
  | "buildplan-rejected"
  | "contract-created"
  | "contract-updated"
  | "contract-acknowledged"
  | "contract-violated"
  | "builder-started"
  | "builder-test-pass"
  | "builder-test-fail"
  | "integration-started"
  | "integration-passed"
  | "integration-failed"
  | "evaluation-started"
  | "evaluation-passed"
  | "evaluation-failed";

export interface EventRecord {
  id: string;
  run_id: string;
  agent_id: string | null;
  type: EventType;
  data: string | null;
  created_at: string;
}
