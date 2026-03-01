---
name: completed-run-review
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: Dashboard correctly displays a completed run with all phases green, evaluation results, and accurate cost totals.

Preconditions:
- A run exists with status='completed', all phases passed
- Multiple agents exist for the run with status='completed', non-zero cost_usd and tokens_used
- A buildplan exists for the run with status='active', containing modules and contracts
- Events exist for the run showing phase transitions
- At least one holdout scenario evaluation result exists (simulated via events or a scenarios table)

Setup (DB seed):
- INSERT run with status='completed', cost_usd=5.50, tokens_used=150000, current_phase='merge'
- INSERT 3+ agents with varying roles (architect, builder, evaluator), all status='completed', with cost breakdown
- INSERT buildplan with 2+ modules, 2+ contracts
- INSERT events for phase transitions and agent lifecycle

Steps:
1. Start dashboard server
2. GET /api/runs — verify completed run appears with status='completed'
3. GET /api/runs/:id — verify all fields populated correctly
4. GET /api/runs/:id/agents — verify all agents show status='completed' with cost/token data
5. GET /api/runs/:id/buildplan — verify modules, contracts, dependencies all present
6. GET /api/runs/:id/events — verify event timeline is populated and chronologically ordered
7. GET /api/runs/:id/scenarios — verify scenario results are returned (pass/fail per scenario)
8. Verify cost consistency: sum of all agent cost_usd should approximately match run cost_usd
9. Verify the HTML Phase Bar renders all phases as completed (green)

Expected Outputs:
- /api/runs/:id returns status='completed' with cost_usd > 0
- /api/runs/:id/agents returns agents all with status='completed'
- /api/runs/:id/buildplan returns JSON with modules array, contracts array, dependencies array
- /api/runs/:id/events returns array ordered by created_at ascending
- /api/runs/:id/scenarios returns array with pass/fail results for each holdout scenario
- Sum of agent costs is close to run total cost (within rounding tolerance)
- HTML renders all pipeline phase indicators as completed state

Pass/Fail Criteria:
- PASS if all endpoints return correct data for a completed run, costs are consistent, and scenarios show results
- FAIL if any endpoint is missing data, costs don't add up, or scenario results are absent