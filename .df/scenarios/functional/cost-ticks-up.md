---
name: cost-ticks-up
type: functional
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRD3EPWYQRTC4V0KTP000QN
---

SCENARIO: Cost ticks up for running agents on each poll

PRECONDITIONS:
- Dashboard server is running with a seeded database
- A run exists with status='running' containing at least one agent with status='running', cost_usd=0.0, created_at set to 10 minutes ago
- The agent has no last_heartbeat set (so current time is used as end)

STEPS:
1. GET /api/runs/{runId}/agents
2. Find the agent with status='running' and cost=0
3. Verify the response includes an 'estimatedCost' field on that agent
4. Verify estimatedCost > 0 (should be approximately 10 * 0.05 = $0.50 for 10 minutes elapsed)
5. Wait 5 seconds (simulating a poll interval)
6. GET /api/runs/{runId}/agents again
7. Verify the estimatedCost on the same agent has increased compared to step 3

EXPECTED OUTPUTS:
- First poll: agent.estimatedCost is approximately 0.50 (10 min * $0.05/min)
- Second poll: agent.estimatedCost > first poll value (time has advanced)
- agent.cost remains 0 (DB value unchanged)
- Both estimatedCost values are positive numbers

FRONTEND VERIFICATION:
- GET / (HTML page)
- The rendered HTML/JS includes logic to display '~' prefix for estimated costs
- The formatCost or equivalent function handles estimated costs with '~$X.XXXX' format
- When agent.cost === 0 and agent is running, the display should use estimatedCost with '~' prefix

PASS CRITERIA:
- AgentSummary response includes 'estimatedCost' numeric field
- estimatedCost > 0 for running agents with cost=0
- estimatedCost increases between polls (time-based)
- Frontend HTML contains logic to prefix estimated costs with '~'
- No DB writes occur (verify by checking agent.cost_usd is still 0 after polls)