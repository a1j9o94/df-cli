---
name: api-returns-valid-json
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: All /api/* endpoints return well-formed JSON with correct fields matching the contract shapes.

Preconditions:
- A run exists with at least one agent, a buildplan, events, and (simulated) scenario results
- Dashboard server is running

Setup (DB seed):
- INSERT run (id='run_test01', spec_id='spec_test01', status='completed', current_phase='merge', cost_usd=3.25, budget_usd=50.0, tokens_used=80000)
- INSERT agent (id='agt_test01', run_id='run_test01', role='architect', name='architect-1', status='completed', cost_usd=1.50, tokens_used=40000)
- INSERT agent (id='agt_test02', run_id='run_test01', role='builder', name='builder-mod1', status='completed', module_id='mod1', cost_usd=1.75, tokens_used=40000, tdd_phase='green')
- INSERT buildplan with plan JSON containing modules, contracts, dependencies
- INSERT multiple events (phase_started, phase_completed, agent_spawned, agent_completed)

Steps and Expected JSON Shapes:

1. GET /api/runs
   - Returns: array of RunSummary objects
   - Each object MUST have: id (string), specId or spec_id (string), status (string), phase or current_phase (string|null), cost or cost_usd (number), budget or budget_usd (number)
   - Content-Type header: application/json
   - Response is valid JSON (JSON.parse does not throw)

2. GET /api/runs/run_test01
   - Returns: single object with run detail
   - MUST have: id, specId/spec_id, status, phase/current_phase, cost/cost_usd, budget/budget_usd, elapsed (string or number), moduleCount (number), completedCount (number)
   - status value matches DB value

3. GET /api/runs/run_test01/agents
   - Returns: array of AgentSummary objects
   - Each MUST have: id (string), role (string), name (string), status (string), pid (number|null), cost/cost_usd (number), tokens/tokens_used (number), elapsed (string|number)
   - Optional: moduleId or module_id (string|null)

4. GET /api/runs/run_test01/buildplan
   - Returns: object with buildplan data
   - MUST have: modules (array), contracts (array), dependencies (array)
   - Each module MUST have: id, title, description
   - Each contract MUST have: name, description, content

5. GET /api/runs/run_test01/events
   - Returns: array of event objects
   - Each MUST have: id, type, created_at or timestamp
   - Optional: agent_id, data

6. GET /api/runs/run_test01/scenarios
   - Returns: array of scenario result objects
   - Each MUST have: name, type (functional|change), and result or status (pass/fail/pending)

7. GET /api/runs/run_test01/modules
   - Returns: array of ModuleStatus objects
   - Each MUST have: id, title, agentStatus or agent_status
   - Optional: tddPhase or tdd_phase, filesChanged, contractsAcknowledged

8. GET /api/runs/nonexistent — returns 404 or empty result, NOT a server crash
9. All responses have Content-Type: application/json header
10. All responses parse as valid JSON

Pass/Fail Criteria:
- PASS if all 7 endpoints return valid JSON with the required fields, and non-existent run returns graceful error
- FAIL if any endpoint returns invalid JSON, missing required fields, wrong Content-Type, or crashes on bad input