---
name: module-agent-tiebreaker-uses-rowid
type: functional
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRF2AKE3XX8RTG4QZ2K7KXT
---

SCENARIO: handleGetModules agent lookup should use rowid as tiebreaker when created_at timestamps match.

SETUP:
1. Create run with 1-module buildplan (mod-a)
2. Insert agent1: module_id='mod-a', status='failed', created_at='2026-03-01T10:00:00Z' (rowid=lower)
3. Insert agent2: module_id='mod-a', status='running', created_at='2026-03-01T10:00:00Z' (rowid=higher, inserted second)

TEST STEPS:
1. GET /api/runs/:id/modules
2. Check agentStatus for mod-a

EXPECTED:
- agentStatus should deterministically be 'running' (the more recently inserted agent)
- Current query: ORDER BY created_at DESC LIMIT 1 may return either agent when timestamps match
- Fix: Change to ORDER BY created_at DESC, rowid DESC LIMIT 1

PASS CRITERIA:
- PASS: Query includes rowid as secondary sort key for deterministic tiebreaking
- FAIL: Query only uses created_at, leaving result nondeterministic when timestamps collide