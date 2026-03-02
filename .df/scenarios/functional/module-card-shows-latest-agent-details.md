---
name: module-card-shows-latest-agent-details
type: functional
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRD336E2WR8VT2VHPW6XR1E
---

SCENARIO: Module card shows the latest agent's cost, tokens, TDD phase, and PID — not the old failed agent's.

SETUP:
1. Create in-memory SQLite DB with schema
2. Insert run (id='run_detail1', status='running', phase='build')
3. Insert buildplan with 1 module: 'mod-core'
4. Insert OLD agent: (id='agt_old1', run_id='run_detail1', role='builder', module_id='mod-core', status='failed', pid=1111, cost_usd=2.50, tokens_used=30000, tdd_phase='red', tdd_cycles=1, created_at='2026-03-01T10:00:00Z', updated_at='2026-03-01T10:30:00Z', error='context exhausted')
5. Insert NEW agent: (id='agt_new1', run_id='run_detail1', role='builder', module_id='mod-core', status='running', pid=2222, cost_usd=1.00, tokens_used=15000, tdd_phase='green', tdd_cycles=2, created_at='2026-03-01T11:00:00Z', updated_at='2026-03-01T11:15:00Z')
6. Create contract_bindings for agt_new1 (2 bindings, 1 acknowledged)
7. Create builder_dependencies for agt_new1 (1 dep, satisfied)
8. Start dashboard server

TEST STEPS:
1. GET /api/runs/run_detail1/modules
2. Parse JSON response
3. Find module with id='mod-core'

EXPECTED:
- agentStatus === 'running' (from agt_new1, not 'failed' from agt_old1)
- cost === 1.00 (from agt_new1, not 2.50 from agt_old1)
- tokens === 15000 (from agt_new1, not 30000 from agt_old1)
- tddPhase === 'green' (from agt_new1, not 'red' from agt_old1)
- tddCycles === 2 (from agt_new1, not 1 from agt_old1)
- contractsAcknowledged should reflect agt_new1's bindings, not agt_old1's
- depsSatisfied should reflect agt_new1's dependencies, not agt_old1's

PASS CRITERIA:
- ALL fields must reflect the latest agent (agt_new1)
- If any field shows agt_old1's values, the bug persists
- The key differentiator is the cost and tddPhase values

IMPLEMENTATION HINT:
The fix is ORDER BY created_at DESC in the agent lookup query in handleGetModules(). This ensures the latest agent's data (including cost, tokens, tdd_phase, tdd_cycles) is returned for the module card. The contract_bindings and builder_dependencies queries also use agent.id, so they must use the latest agent's ID.