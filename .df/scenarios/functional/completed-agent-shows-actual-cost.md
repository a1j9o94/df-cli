---
name: completed-agent-shows-actual-cost
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Completed agent with recorded cost shows actual cost without estimate flag.

PRECONDITIONS:
- A run exists with status 'running'
- A builder agent exists with status='completed', cost_usd=5.0, tokens_used=60000
- created_at=2026-03-01T11:05:00Z, updated_at=2026-03-01T11:15:00Z

STEPS:
1. Start the dashboard server with the test DB
2. GET /api/runs/{runId}/agents
3. Find the completed agent in the response

EXPECTED OUTPUT:
- The agent's 'cost' field should be 5.0
- The agent's 'estimatedCost' field should be 5.0 (equal to actual, since actual is known)
- The agent's 'isEstimate' field should be false
- Response status 200

PASS/FAIL:
- PASS if cost === 5.0 AND estimatedCost === 5.0 AND isEstimate === false
- FAIL if isEstimate is true for a completed agent, or estimatedCost differs from cost