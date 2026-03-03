---
name: phases-endpoint-derives-from-PHASE_ORDER
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJS1H35CGTM3ZRT2YN5H2FZN
---

SCENARIO: The /api/runs/:id/phases endpoint exists and derives phase statuses from PHASE_ORDER.

PRECONDITIONS:
- Dashboard server running
- A run exists with current_phase 'build'

STEPS:
1. GET /api/runs/{runId}/phases
2. Inspect the JSON response

EXPECTED:
- Response status: 200 (not 404)
- Response is a JSON array of phase objects
- Each phase object has: { id, label, status }
- status values are: 'completed' (phases before current), 'active' (current phase), 'pending' (phases after current), or 'skipped'
- The phases list is derived from PHASE_ORDER in src/pipeline/phases.ts, NOT hardcoded in server.ts
- The server.ts route handler includes a 'phases' case in the switch statement

VERIFICATION:
- Grep server.ts for 'phases' case in the route switch
- Grep server.ts for import of PHASE_ORDER from pipeline/phases
- The endpoint should import and iterate PHASE_ORDER to compute phase statuses