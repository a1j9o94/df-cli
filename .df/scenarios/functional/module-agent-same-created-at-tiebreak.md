---
name: module-agent-same-created-at-tiebreak
type: functional
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRDYQ38GMEC977XGSYRYG6C
---

SCENARIO: When two agents for the same module have identical created_at timestamps, ORDER BY created_at DESC LIMIT 1 is nondeterministic.

SETUP:
1. Create run with 1-module buildplan (mod-a)
2. Insert agent1: module_id='mod-a', status='failed', created_at='2026-03-01T10:00:00Z'
3. Insert agent2: module_id='mod-a', status='running', created_at='2026-03-01T10:00:00Z' (same timestamp)

TEST STEPS:
1. GET /api/runs/:id/modules
2. Check agentStatus for mod-a

EXPECTED:
- If both agents have the same created_at, the query should still return a deterministic result
- Consider adding rowid DESC as secondary sort for tiebreaking

PASS CRITERIA:
- The query should reliably return the most recently inserted agent when timestamps match
- Current fix with ORDER BY created_at DESC LIMIT 1 may be nondeterministic in this edge case