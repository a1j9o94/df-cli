---
name: completed-agent-no-estimate
type: functional
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

SCENARIO: Completed or failed agents should NOT get estimated costs — only running/spawning agents do.

PRECONDITIONS:
- A run with multiple agents:
  - Agent A: status='completed', cost_usd=0.50
  - Agent B: status='failed', cost_usd=0.0, created_at=5 minutes ago
  - Agent C: status='running', cost_usd=0.0, created_at=5 minutes ago

TEST STEPS:
1. GET /api/runs/:runId/agents
2. For Agent A (completed): estimatedCost should be 0, null, or absent — frontend shows real cost '$0.5000'
3. For Agent B (failed, no real cost): estimatedCost should be 0, null, or absent — this is intentional since the agent is no longer running and cost was never reported
4. For Agent C (running): estimatedCost should be ~0.25

PASS CRITERIA:
- Only agents with status 'running' or 'spawning' receive non-zero estimatedCost
- Completed/failed agents use their DB cost_usd (even if 0)
- Frontend only shows '~' prefix for running agents with estimated costs