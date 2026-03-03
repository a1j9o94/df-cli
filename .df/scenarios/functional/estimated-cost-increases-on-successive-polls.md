---
name: estimated-cost-increases-on-successive-polls
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRJ1FTAH2THWVNMC3T1NGRB
---

Setup: Create a run with one agent in 'running' status, cost_usd=0, created_at=NOW. Steps: 1. GET /api/runs/{runId}/agents, record estimatedCost as E1. 2. Wait 2 seconds. 3. GET /api/runs/{runId}/agents again, record estimatedCost as E2. 4. Verify E2 > E1 (cost estimate grows with elapsed time). Pass criteria: Each successive poll returns a higher estimatedCost for running agents, confirming that the poll triggers re-computation based on current time minus created_at.