---
name: dashboard-shows-running-on-continue
type: functional
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRD336E2WR8VT2VHPW6XR1E
---

SCENARIO: Dashboard shows 'running' status for a module after dark continue, not stale 'failed' status.

SETUP:
1. Create an in-memory SQLite DB with schema
2. Insert a run (id='run_cont1', status='running', phase='build')
3. Insert a buildplan with 2 modules: 'mod-A' and 'mod-B'
4. Insert agent for mod-A: (id='agt_old', role='builder', module_id='mod-A', status='failed', created_at='2026-03-01T11:00:00Z')
5. Insert agent for mod-A (retry): (id='agt_new', role='builder', module_id='mod-A', status='running', created_at='2026-03-01T12:00:00Z')
6. Insert agent for mod-B: (id='agt_b', role='builder', module_id='mod-B', status='completed', created_at='2026-03-01T11:00:00Z')
7. Start dashboard server with this DB

TEST STEPS:
1. GET /api/runs/run_cont1/modules
2. Parse JSON response
3. Find the module with id='mod-A'

EXPECTED:
- mod-A.agentStatus === 'running' (NOT 'failed')
- The returned status reflects the LATEST agent (agt_new), not the earliest (agt_old)

PASS CRITERIA:
- The agentStatus field for mod-A must be 'running'
- If it returns 'failed', the bug is NOT fixed

IMPLEMENTATION HINT FOR EVALUATOR:
The fix should be in handleGetModules() in src/dashboard/server.ts. The SQL query for agent lookup must include ORDER BY created_at DESC before LIMIT 1.