---
name: budget-progress-reflects-estimated-costs
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

SETUP: Start dashboard server with a run (budget_usd=10.0, cost_usd=4.0) containing 2 running agents (cost_usd=0 each, created_at=10min ago giving ~0.50 each estimated). STEPS: 1. GET /api/runs/{runId}. 2. Check the cost and estimatedCost fields. 3. Load the dashboard HTML and inspect the run header. EXPECTED: API returns cost=4.0, estimatedCost~=1.0 (2 agents * 10min * 0.05/min). Budget percentage should be calculated as (cost + estimatedCost) / budget * 100 = ~50%. The progress bar in the dashboard run header reflects this percentage. PASS CRITERIA: Budget percentage accounts for estimated costs, not just actual costs. Dashboard progress bar width matches (actual+estimated)/budget ratio.