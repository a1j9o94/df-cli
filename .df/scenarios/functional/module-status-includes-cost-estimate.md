---
name: module-status-includes-cost-estimate
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Module status endpoint includes cost estimates for modules with running agents.

PRECONDITIONS:
- A run with an active buildplan with 2 modules
- Module 1 (mod-api-server): builder agent status='running', cost_usd=0, created_at 8 minutes ago
- Module 2 (mod-dashboard-ui): builder agent status='pending', cost_usd=0

STEPS:
1. Start the dashboard server
2. GET /api/runs/{runId}/modules

EXPECTED OUTPUT:
- Module 1 (running builder): estimatedCost > 0, isEstimate = true
- Module 2 (pending builder): estimatedCost = 0, isEstimate = false
- Both modules should still have 'cost' field with their actual DB values

PASS/FAIL:
- PASS if running module has estimatedCost > 0 AND pending module has estimatedCost === 0
- FAIL if estimatedCost fields are missing from module status objects