---
name: running-agent-shows-estimated-cost
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRJ1FTAH2THWVNMC3T1NGRB
---

Setup: Create a run with one agent in 'running' status, cost_usd=0, created_at=5 minutes ago. Steps: 1. GET /api/runs/{runId}/agents. 2. Verify the agent JSON includes estimatedCost > 0 (approximately 0.25 at 0.05/min for 5 minutes). 3. Load dashboard HTML via GET /. 4. Verify the rendered agent card displays estimated cost text (e.g., '~$0.25' or 'Est: $0.25'). Pass criteria: estimatedCost field is present and > 0 for running agents with cost_usd=0, AND the dashboard HTML renders estimated cost visually distinct from actual cost.