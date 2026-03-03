---
name: run-level-estimated-cost-aggregation
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRJ1FTAH2THWVNMC3T1NGRB
---

Setup: Create a run with 3 agents: agent A (running, cost_usd=0, created 3 min ago), agent B (running, cost_usd=0, created 1 min ago), agent C (completed, cost_usd=0.40). Steps: 1. GET /api/runs/{runId}. 2. Verify run JSON includes estimatedCost field that sums estimates for active agents only (agent A ~0.15, agent B ~0.05, agent C = 0, total ~0.20). 3. Load dashboard and verify the run header displays both actual cost and estimated cost for running agents. Pass criteria: Run-level estimatedCost is the sum of per-agent estimated costs (only active agents contribute). Dashboard run header shows estimated cost alongside actual cost and budget.