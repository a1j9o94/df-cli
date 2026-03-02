---
name: running-agent-shows-estimated-cost
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Running agent with zero actual cost shows estimated cost in API response.

PRECONDITIONS:
- A run exists with status 'running' and current_phase 'build'
- A builder agent exists for that run with status='running', cost_usd=0.0, tokens_used=0
- The agent's created_at is 10 minutes ago (2026-03-01T11:50:00Z, current time 2026-03-01T12:00:00Z)

STEPS:
1. Start the dashboard server with the test DB
2. GET /api/runs/{runId}/agents
3. Find the running agent in the response

EXPECTED OUTPUT:
- The agent object MUST have an 'estimatedCost' field that is a number > 0
  (at 10 minutes elapsed with ~$0.05/min heuristic, expect estimatedCost approximately 0.50)
- The agent object MUST have an 'isEstimate' field that is true
- The agent's 'cost' field should still be 0.0 (the actual recorded cost unchanged)
- Response status 200

PASS/FAIL:
- PASS if estimatedCost > 0 AND isEstimate === true AND cost === 0.0
- FAIL if estimatedCost is 0 or missing, or isEstimate is false or missing