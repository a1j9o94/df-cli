---
name: pending-agent-zero-estimate
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Pending agent (not yet started) should have zero estimated cost.

PRECONDITIONS:
- A run exists with a buildplan containing 2 modules
- Agent 1: running (has been assigned and started)
- Agent 2: pending (waiting for dependencies, not yet started)

STEPS:
1. Start the dashboard server
2. GET /api/runs/{runId}/agents
3. Find the pending agent in the response

EXPECTED OUTPUT:
- The pending agent's 'cost' field should be 0.0
- The pending agent's 'estimatedCost' field should be 0.0 (no elapsed time to estimate from)
- The pending agent's 'isEstimate' field should be false
- Response status 200

PASS/FAIL:
- PASS if estimatedCost === 0.0 AND isEstimate === false for a pending agent
- FAIL if estimatedCost > 0 for a pending agent, or isEstimate is true