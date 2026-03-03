---
name: completed-agent-zero-estimated-cost
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRJ1FTAH2THWVNMC3T1NGRB
---

Setup: Create a run with one agent in 'completed' status, cost_usd=0.50, created_at=10 minutes ago. Steps: 1. GET /api/runs/{runId}/agents. 2. Verify the agent JSON has estimatedCost=0 (completed agents should not have estimates). 3. Load dashboard HTML. 4. Verify the agent card shows actual cost $0.50 without an estimated cost indicator. Pass criteria: estimatedCost is 0 for completed agents, and only actual cost is displayed in the dashboard.