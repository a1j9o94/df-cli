---
name: estimate-transitions-to-real-cost
type: functional
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

SCENARIO: When an agent completes and reports real cost, the '~' prefix disappears and the number changes to the real value.

PRECONDITIONS:
- A run exists in the DB with status 'running'
- An agent exists with: status='running', cost_usd=0.0, created_at=5 minutes ago

PHASE 1 - ESTIMATED COST:
1. GET /api/runs/:runId/agents
2. Verify agent has estimatedCost > 0 (approximately 0.25 for 5 minutes)
3. Verify agent cost field is 0
4. Frontend should display '~$0.25' (tilde prefix indicating estimate)

PHASE 2 - AGENT COMPLETES WITH REAL COST:
5. UPDATE agents SET status='completed', cost_usd=0.35, updated_at=datetime('now') WHERE id=:agentId
6. GET /api/runs/:runId/agents
7. Verify agent cost field is 0.35
8. Verify estimatedCost is either absent, null, or 0 for completed agents (or still present but irrelevant)

EXPECTED FRONTEND BEHAVIOR:
- When cost > 0: Display '$0.3500' (no tilde prefix, uses real cost)
- When cost == 0 and status is running: Display '~$0.25' (tilde prefix, uses estimatedCost)

PASS CRITERIA:
- estimatedCost is returned for running agents with cost_usd=0
- After agent reports real cost (cost_usd > 0), the frontend displays real cost without '~' prefix
- Run-level cost in header correctly sums: real costs from completed agents + estimated costs from running agents