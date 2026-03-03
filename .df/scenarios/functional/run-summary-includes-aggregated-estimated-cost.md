---
name: run-summary-includes-aggregated-estimated-cost
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

SETUP: Start dashboard server with a DB containing a run (budget_usd=50.0, cost_usd=1.0) with 2 running agents (cost_usd=0 each, created_at=3min ago) and 1 completed agent (cost_usd=1.0). STEPS: 1. GET /api/runs/{runId}. 2. Parse JSON response. EXPECTED: Response includes estimatedCost field that is the sum of individual running agent estimated costs (should be ~0.30 for 2 agents at 3min each at 0.05/min rate). The total cost shown should be cost + estimatedCost. PASS CRITERIA: RunSummary.estimatedCost > 0 when running agents exist. RunSummary.estimatedCost equals sum of per-agent estimates.