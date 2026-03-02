---
name: run-header-sums-estimated-and-real
type: functional
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

SCENARIO: Run-level cost in the header correctly sums estimated costs from running agents with real costs from completed agents.

PRECONDITIONS:
- A run exists with status 'running'
- Agent A: status='completed', cost_usd=0.50 (real cost reported)
- Agent B: status='running', cost_usd=0.0, created_at=6 minutes ago (estimated ~$0.30)
- Agent C: status='running', cost_usd=0.0, created_at=4 minutes ago (estimated ~$0.20)

TEST STEPS:
1. GET /api/runs/:runId (run detail endpoint)
2. Verify the run response includes 'estimatedCost' or the 'cost' field accounts for estimates
3. The run-level cost should be approximately: 0.50 (real) + 0.30 (est) + 0.20 (est) = ~$1.00

ALTERNATIVE: If run-level estimation is at the run endpoint:
1. GET /api/runs/:runId
2. Verify run.estimatedCost or similar field sums agent estimates
3. Total should include both real and estimated costs

FRONTEND VERIFICATION:
- Run header stat labeled 'Cost' should show the combined total
- If any agent costs are estimated, the run-level display should indicate this (e.g., show '~' prefix on the estimated portion)

PASS CRITERIA:
- Run-level cost includes both real agent costs and estimated costs for running agents
- The displayed total is approximately the sum of all real + estimated agent costs
- As agents complete and report real costs, the total transitions from estimated to real