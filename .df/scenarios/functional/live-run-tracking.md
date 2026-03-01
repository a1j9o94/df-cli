---
name: live-run-tracking
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: Dashboard tracks a live run in real-time with auto-polling.

Preconditions:
- Dark Factory project initialized with state.db
- A run exists in 'running' status with current_phase set to a valid phase (e.g., 'architect')
- At least one agent exists for that run

Steps:
1. Start the dashboard server (dark dash or programmatic startup)
2. GET /api/runs — verify the running run appears in the list with status='running'
3. GET /api/runs/:id — verify run detail includes current phase, cost, elapsed time
4. GET /api/runs/:id/agents — verify agents list is populated with role, status, cost
5. Simulate phase advancement: UPDATE the run's current_phase in DB from 'architect' to 'build'
6. GET /api/runs/:id again — verify the phase field reflects the new phase
7. GET /api/runs/:id/buildplan — after architect completes, verify buildplan JSON includes modules, contracts, dependencies
8. GET /api/runs/:id/modules — verify per-module status data from parallel_build_progress view
9. Verify the HTML page contains auto-poll JavaScript that fetches /api/runs/:id every 3 seconds
10. Verify the HTML contains a Pipeline Phase Bar with all 8 phases rendered

Expected Outputs:
- /api/runs returns array with at least one run where status='running'
- /api/runs/:id returns object with fields: id, specId (or spec_id), status, phase (or current_phase), cost, budget, elapsed
- /api/runs/:id/agents returns array of agents with fields: id, role, name, status, pid, cost, tokens, elapsed
- /api/runs/:id/modules returns array of module status objects with fields matching ModuleStatus contract
- Phase bar section in HTML renders phases: scout, architect, plan-review, build, integrate, evaluate, merge (or similar pipeline phases)
- HTML contains setInterval or setTimeout with ~3000ms interval for polling

Pass/Fail Criteria:
- PASS if all API endpoints return correctly shaped JSON and HTML contains auto-polling with phase bar
- FAIL if any endpoint returns malformed JSON, or auto-poll is missing/broken, or phase bar doesn't render all phases