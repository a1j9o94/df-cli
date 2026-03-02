---
name: module-card-shows-latest-agent-details
type: functional
spec_id: run_01KJNH14DGMNSTJH5EJVY17TQ9
created_by: agt_01KJNH14DHP9J33BQJ5KW6S6ZM
---

Test: Module card displays the retry agent's cost, tokens, elapsed time, PID, and TDD phase — not the old failed agent's.

SETUP:
1. Create in-memory SQLite DB with schema
2. Insert a run (run_r3) in status 'running', current_phase 'build'
3. Insert a buildplan with 1 module: mod-widget
4. Insert OLD failed builder agent for mod-widget:
   - id='agt_old_widget', status='failed', pid=1000
   - cost_usd=3.50, tokens_used=40000, tdd_phase='red', tdd_cycles=2
   - created_at='2026-03-01T10:00:00Z', updated_at='2026-03-01T10:20:00Z'
   - error='Build failed: test assertion error'
5. Insert NEW retry builder agent for mod-widget:
   - id='agt_new_widget', status='running', pid=2000
   - cost_usd=1.25, tokens_used=15000, tdd_phase='green', tdd_cycles=1
   - created_at='2026-03-01T10:30:00Z', updated_at='2026-03-01T10:35:00Z'
6. Create contract_bindings for agt_new_widget (1 acknowledged of 2 total)
7. Create builder_dependencies for agt_new_widget (0 satisfied of 1 total)

TEST STEPS:
1. GET /api/runs/{run_r3}/modules
2. Parse JSON response
3. Find mod-widget in results

EXPECTED:
- agentStatus = 'running' (from new agent, NOT 'failed' from old)
- cost = 1.25 (new agent's cost, NOT 3.50)
- tokens = 15000 (new agent's tokens, NOT 40000)
- tddPhase = 'green' (new agent's TDD phase, NOT 'red')
- tddCycles = 1 (new agent's cycles, NOT 2)
- contractsAcknowledged and contractsTotal reflect NEW agent's bindings
- depsSatisfied and depsTotal reflect NEW agent's dependencies

PASS CRITERIA:
- ALL fields must reflect the LATEST (most recent created_at) agent's data
- If any field shows old agent data → FAIL