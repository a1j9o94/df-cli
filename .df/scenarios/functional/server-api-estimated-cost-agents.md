---
name: server-api-estimated-cost-agents
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: The server API includes estimatedCost and isEstimate fields on AgentSummary responses.
Setup: Start dashboard server with test DB containing running agents with cost_usd=0 and completed agents with real cost.
Steps:
1. Create in-memory DB with schema, seed a run and agents:
   - Agent A: status=running, cost_usd=0, created_at=recent (should produce estimatedCost > 0)
   - Agent B: status=completed, cost_usd=5.0 (should have estimatedCost=0)
   - Agent C: status=pending, cost_usd=0 (should have estimatedCost=0, not started)
2. Start server with test DB, GET /api/runs/{runId}/agents
3. Verify Agent A response: estimatedCost > 0, isEstimate = true
4. Verify Agent B response: estimatedCost = 0, isEstimate = false
5. Verify Agent C response: estimatedCost = 0, isEstimate = false (pending has not started)
Expected output: Running agents with zero real cost show positive estimated cost; all others show zero.
Pass criteria: Running agent with cost=0 has estimatedCost > 0 and isEstimate=true; completed agent has estimatedCost=0 and isEstimate=false; pending agent has estimatedCost=0.