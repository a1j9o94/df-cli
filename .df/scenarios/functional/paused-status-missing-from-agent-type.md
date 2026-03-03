---
name: paused-status-missing-from-agent-type
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSW9NVMB0Y8KQZK63QQSPKS
---

SCENARIO: AgentStatus type must include 'paused' status as required by the pause/resume spec.
STEPS: 1. Read src/types/agent.ts. 2. Check the AgentStatus type union.
EXPECTED: AgentStatus includes 'paused' alongside pending, spawning, running, completed, failed, killed, incomplete.
PASS CRITERIA: The literal string 'paused' appears in the AgentStatus union type. FAIL if AgentStatus only has pending|spawning|running|completed|failed|killed|incomplete.
