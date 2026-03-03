---
name: agent-summary-has-estimated-cost-fields
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRHDHFNQVQME4TY2F9RVVJM
---

SCENARIO: AgentSummary interface and API response must include estimatedCost and isEstimate fields.

STEPS:
1. Read src/dashboard/server.ts AgentSummary interface
2. Verify it includes: estimatedCost: number, isEstimate: boolean
3. Start dashboard server with test DB containing a running agent (cost_usd=0, created_at=10min ago)
4. GET /api/runs/{runId}/agents
5. Parse the running agent object

PASS CRITERIA:
- AgentSummary interface has estimatedCost (number) and isEstimate (boolean) fields
- Running agent with cost_usd=0: estimatedCost > 0, isEstimate = true
- Completed agent with cost_usd=5.0: estimatedCost = 5.0, isEstimate = false
- Pending agent: estimatedCost = 0, isEstimate = false

FAIL CRITERIA:
- AgentSummary only has 'cost' field
- No estimatedCost or isEstimate in API response