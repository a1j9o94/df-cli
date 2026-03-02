---
name: run-projected-cost-includes-running-agents
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Run summary projected cost includes estimates from running agents.

PRECONDITIONS:
- A run with budget_usd=50.0, cost_usd=12.5
- Agent 1: completed, cost_usd=5.0 (actual)
- Agent 2: completed, cost_usd=7.5 (actual)
- Agent 3: running, cost_usd=0.0, created_at 15 minutes ago

STEPS:
1. Start the dashboard server
2. GET /api/runs/{runId}

EXPECTED OUTPUT:
- run.cost should be 12.5 (the actual recorded cost)
- run.projectedCost should be > 12.5 (includes estimated cost of running agent 3)
  With 15 min elapsed at ~$0.05/min, agent 3 estimate ~$0.75
  So projectedCost should be approximately 13.25
- projectedCost MUST always be >= cost (actual)

PASS/FAIL:
- PASS if projectedCost > cost AND projectedCost >= 12.5
- FAIL if projectedCost is missing, or projectedCost < cost, or projectedCost === cost when running agents exist