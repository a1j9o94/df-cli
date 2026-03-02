---
name: dashboard-shows-running-on-continue
type: functional
spec_id: run_01KJNH14DGMNSTJH5EJVY17TQ9
created_by: agt_01KJNH14DHP9J33BQJ5KW6S6ZM
---

Test: After 'dark continue', module card shows latest agent status (Running), not stale failed status.

SETUP:
1. Create in-memory SQLite DB with schema
2. Insert a run (run_r1) in status 'running', current_phase 'build'
3. Insert a buildplan with 2 modules: mod-alpha, mod-beta
4. Insert FIRST builder agent for mod-alpha: agt_old, status='failed', created_at='2026-03-01T11:00:00Z', cost_usd=1.5, tokens_used=20000, pid=1111
5. Insert SECOND (retry) builder agent for mod-alpha: agt_new, status='running', created_at='2026-03-01T11:10:00Z', cost_usd=0.5, tokens_used=5000, pid=2222
6. Insert builder agent for mod-beta: agt_beta, status='completed', created_at='2026-03-01T11:00:00Z'

TEST STEPS:
1. GET /api/runs/{run_r1}/modules
2. Parse JSON response

EXPECTED:
- Response status 200
- mod-alpha entry has agentStatus='running' (NOT 'failed')
- mod-beta entry has agentStatus='completed'

PASS CRITERIA:
- agentStatus for mod-alpha MUST be 'running'
- If agentStatus is 'failed', the bug is NOT fixed (FAIL)