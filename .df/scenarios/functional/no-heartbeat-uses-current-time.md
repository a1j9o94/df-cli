---
name: no-heartbeat-uses-current-time
type: functional
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

SCENARIO: Agent with no heartbeat (just created, never sent heartbeat) still gets an estimated cost using current time.

PRECONDITIONS:
- A run exists with status 'running'
- An agent exists with: status='running', cost_usd=0.0, created_at=3 minutes ago, last_heartbeat=NULL

TEST STEPS:
1. GET /api/runs/:runId/agents
2. Find the agent in the response
3. Verify estimatedCost is approximately 0.15 (3 min * $0.05/min, tolerance ±0.03)

EXPECTED BEHAVIOR:
- When last_heartbeat is NULL, the server uses current time (Date.now()) as the end point for elapsed calculation
- This matches the spec requirement: 'Read created_at and last_heartbeat (or current time if no heartbeat)'

PASS CRITERIA:
- estimatedCost is a positive number proportional to time since created_at
- No error occurs when last_heartbeat is NULL
- The computation falls back to current time gracefully