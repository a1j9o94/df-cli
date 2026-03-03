---
name: cost-estimates-update-on-successive-polls
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

SETUP: Start dashboard server with a DB containing a run with 1 running agent (cost_usd=0, created_at=now). STEPS: 1. GET /api/runs/{runId}/agents at T=0, record estimatedCost as E1. 2. Wait 2 seconds. 3. GET /api/runs/{runId}/agents at T=2s, record estimatedCost as E2. EXPECTED: E2 > E1, because the agent has been running longer. The difference E2-E1 should approximately equal 2s * (rate/60) ~= 0.0017 at 0.05/min. PASS CRITERIA: Second poll returns a higher estimatedCost than first poll for the same running agent. The estimate is monotonically increasing for running agents.