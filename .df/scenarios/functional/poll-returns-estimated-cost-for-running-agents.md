---
name: poll-returns-estimated-cost-for-running-agents
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

SETUP: Start dashboard server with a DB containing a run with 3 agents: 1 completed (cost_usd=0.50), 1 running (cost_usd=0, created_at=5min ago), 1 pending (cost_usd=0). STEPS: 1. GET /api/runs/{runId}/agents. 2. Parse JSON response array. EXPECTED: Running agent has estimatedCost > 0 and isEstimate=true. Completed agent has cost=0.50, estimatedCost=0, isEstimate=false. Pending agent has estimatedCost=0 and isEstimate=false. The running agent estimatedCost should approximate 5min * rate (e.g. ~0.25 at 0.05/min). PASS CRITERIA: Response includes per-agent estimatedCost and isEstimate fields. Running agents have positive estimatedCost. Non-running agents have estimatedCost=0.