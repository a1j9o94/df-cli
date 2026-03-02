---
name: module-agent-query-needs-order-by-created-at-desc
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQFP36EHGHCDAV3C555GN19
---

SCENARIO: handleGetModules in dashboard server returns stale agent on retry because query lacks ORDER BY.

SETUP:
1. Create run with buildplan having module 'mod-a'
2. Spawn builder for mod-a -> status=failed
3. Resume: spawn NEW builder for mod-a -> status=running

STEPS:
1. GET /api/runs/:id/modules
2. Check agentStatus for mod-a

EXPECTED: agentStatus = 'running' (the latest agent)
ACTUAL: agentStatus = 'failed' (the first agent, because query is SELECT * FROM agents WHERE run_id=? AND module_id=? LIMIT 1 without ORDER BY created_at DESC)

PASS: Query includes ORDER BY created_at DESC LIMIT 1
FAIL: Query returns nondeterministic/stale agent