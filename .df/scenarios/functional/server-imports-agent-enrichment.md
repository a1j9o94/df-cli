---
name: server-imports-agent-enrichment
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRHDHFNQVQME4TY2F9RVVJM
---

SCENARIO: Dashboard server must import and use agent-enrichment.ts utilities.

STEPS:
1. Read src/dashboard/server.ts import statements
2. Check for import of computeElapsedMs or estimateCost from agent-enrichment.ts
3. Verify these functions are called inside handleGetAgents() and handleGetModules()
4. Verify toRunSummary() uses estimateCost for projectedCost calculation

PASS CRITERIA:
- server.ts imports from utils/agent-enrichment.ts
- handleGetAgents maps agent records through a cost estimation helper
- toRunSummary includes projectedCost field computed from running agent estimates

FAIL CRITERIA:
- server.ts does not import agent-enrichment
- AgentSummary lacks estimatedCost and isEstimate fields
- RunSummary lacks projectedCost field