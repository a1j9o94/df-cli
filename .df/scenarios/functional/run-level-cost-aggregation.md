---
name: run-level-cost-aggregation
type: functional
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRD3EPWYQRTC4V0KTP000QN
---

SCENARIO: Run-level cost in header sums estimated and real costs correctly

PRECONDITIONS:
- Dashboard server running with seeded database
- Run 'run_test1' with status='running', cost_usd=2.0 (from completed agents)
- Agent A: status='completed', cost_usd=2.0 (real cost reported)
- Agent B: status='running', cost_usd=0.0, created_at=6 minutes ago (still running)
- Agent C: status='running', cost_usd=0.0, created_at=4 minutes ago (still running)

STEPS:
1. GET /api/runs/run_test1
2. Verify RunSummary includes 'estimatedCost' field
3. Expected run.estimatedCost = (6 * 0.05) + (4 * 0.05) = 0.30 + 0.20 = ~$0.50 (sum of running agent estimates)
4. The total display cost = run.cost + run.estimatedCost = 2.0 + 0.50 = ~$2.50

FRONTEND VERIFICATION:
- The run header Cost stat should show approximately '~$2.5000 / $50.0000'
- The '~' prefix indicates the total includes estimates
- If all agents complete and report real costs, the '~' disappears

EDGE CASES:
5. GET /api/runs/run_test2 (completed run, all agents done)
6. Verify estimatedCost is 0 for completed runs (no running agents)
7. Run header shows real cost without '~' prefix

PASS CRITERIA:
- RunSummary.estimatedCost is the sum of individual running agent estimated costs
- RunSummary.estimatedCost = 0 when no agents are running
- Frontend sums cost + estimatedCost for header display
- '~' prefix present when estimatedCost > 0
- '~' prefix absent when estimatedCost = 0