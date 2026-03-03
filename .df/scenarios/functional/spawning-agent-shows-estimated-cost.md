---
name: spawning-agent-shows-estimated-cost
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRSVHVX3DZXYM8J0DKSDP86
---

SCENARIO: An agent in 'spawning' status with cost_usd=0 should show estimated cost just like 'running' agents. SETUP: Create a run with one agent in 'spawning' status, cost_usd=0, created_at=3 minutes ago. STEPS: 1. GET /api/runs/{runId}/agents. 2. Find the spawning agent in the response. 3. Verify estimatedCost > 0 and isEstimate = true. EXPECTED: Spawning agents are treated the same as running agents for cost estimation since they are actively consuming resources. PASS: estimatedCost > 0 AND isEstimate = true for spawning agents. FAIL: estimatedCost = 0 for spawning agents.