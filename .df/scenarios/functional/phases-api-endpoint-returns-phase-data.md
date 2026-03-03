---
name: phases-api-endpoint-returns-phase-data
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

SCENARIO: New /api/runs/:id/phases endpoint returns structured phase progress data.

PRECONDITIONS:
- A run 'run_phase_test' exists with status 'running', current_phase 'build', mode='thorough'
- Run config does NOT have skip_architect=true
- An active buildplan exists with module_count=3

STEPS:
1. Start dashboard server on test port
2. GET /api/runs/run_phase_test/phases

EXPECTED RESULTS:
- Response status: 200
- Response is a JSON array of phase objects
- Each phase object has at minimum: { id: string, label: string, status: 'completed' | 'active' | 'pending' | 'skipped' }
- The phases returned should be:
  - { id: 'scout', status: 'completed' }
  - { id: 'architect', status: 'completed' }
  - { id: 'plan-review', status: 'completed' }
  - { id: 'build', status: 'active' }
  - { id: 'integrate', status: 'pending' }
  - { id: 'evaluate-functional', status: 'pending' }
  - { id: 'evaluate-change', status: 'pending' }
  - { id: 'merge', status: 'pending' }
- Phase IDs match the PHASE_ORDER array from src/pipeline/phases.ts

PASS CRITERIA:
- The server.ts route handler matches /api/runs/:id/phases
- The response correctly derives phase statuses from the runs current_phase field
- Phases before current_phase in PHASE_ORDER are marked 'completed'
- The current_phase is marked 'active'
- Phases after current_phase are marked 'pending'
- Skippable phases (per shouldSkipPhase logic) are marked 'skipped' when applicable