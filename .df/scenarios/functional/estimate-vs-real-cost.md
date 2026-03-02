---
name: estimate-vs-real-cost
type: functional
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRD3EPWYQRTC4V0KTP000QN
---

SCENARIO: Estimated cost transitions to real cost when agent completes

PRECONDITIONS:
- Dashboard server is running with a seeded database
- A run exists with status='running'
- Agent 'agt_build1' has status='running', cost_usd=0.0, created_at=5 minutes ago

STEPS:
1. GET /api/runs/{runId}/agents
2. Find agent with id='agt_build1' (running, cost=0)
3. Verify response has both 'cost' (=0) and 'estimatedCost' (>0, ~$0.25 for 5 min)
4. Now simulate agent completion: UPDATE agents SET status='completed', cost_usd=0.35, updated_at=now WHERE id='agt_build1'
5. GET /api/runs/{runId}/agents again
6. Find agent with id='agt_build1' (now completed, cost=0.35)
7. Verify 'cost' is now 0.35 (the real reported cost)
8. Verify 'estimatedCost' is 0 (no estimate needed for completed agents)

EXPECTED OUTPUTS:
- Before completion: agent.cost=0, agent.estimatedCost>0 (approximately 0.25)
- After completion: agent.cost=0.35, agent.estimatedCost=0

FRONTEND DISPLAY VERIFICATION:
- Before: agent card shows '~$0.2500' (estimated with tilde prefix)
- After: agent card shows '$0.3500' (real cost, no tilde)
- The frontend JS logic should check: if (agent.cost > 0) show real cost, else if running show ~estimatedCost

RUN-LEVEL COST VERIFICATION:
1. GET /api/runs/{runId} before agent completion
2. Verify RunSummary has 'estimatedCost' field reflecting running agents
3. GET /api/runs/{runId} after agent completion  
4. Verify run.estimatedCost decreased (one fewer running agent contributing estimates)
5. The run header in the frontend sums cost + estimatedCost for display

PASS CRITERIA:
- estimatedCost > 0 for running agents with cost=0
- estimatedCost = 0 for completed agents
- cost field reflects real DB value (0 before, 0.35 after)
- RunSummary also includes estimatedCost field
- Frontend distinguishes estimated vs real with '~' prefix
- '~' disappears when real cost is reported