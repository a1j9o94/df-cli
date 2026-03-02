---
name: cost-ticks-up-during-polling
type: functional
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

SCENARIO: Cost display increases every 5 seconds for running agents during dashboard polling.

PRECONDITIONS:
- A run exists in the DB with status 'running'
- An agent exists with: status='running', cost_usd=0.0, created_at=10 minutes ago, last_heartbeat=now

TEST STEPS:
1. GET /api/runs/:runId/agents
2. Parse the agent response JSON
3. Verify the response contains an 'estimatedCost' field
4. Verify estimatedCost is approximately 0.50 (10 min * $0.05/min, tolerance ±0.05)
5. Wait 5 seconds
6. GET /api/runs/:runId/agents again
7. Verify estimatedCost has increased (new value > old value)

EXPECTED OUTPUTS:
- Agent response includes 'estimatedCost' field as a number
- estimatedCost is proportional to elapsed time since created_at
- estimatedCost increases between successive polls
- The DB cost_usd field remains 0.0 (no DB writes on reads)

PASS CRITERIA:
- estimatedCost field is present and is a positive number for running agents
- estimatedCost increases on subsequent polls (demonstrating real-time estimation)
- DB is not modified (SELECT cost_usd FROM agents WHERE id=:agentId returns 0.0 after polls)

FRONTEND VERIFICATION:
- The agent cost in the dashboard shows with a '~' prefix (e.g., '~$0.50')
- The run header cost stat includes estimated costs in its total