---
name: module-query-returns-stale-agent-on-retry
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ61PK9FQEVPTC780QYZBRS
---

SCENARIO: In handleGetModules (src/dashboard/server.ts line 367), the module agent lookup uses 'SELECT * FROM agents WHERE run_id = ? AND module_id = ? LIMIT 1' without ORDER BY. When a module has been retried (failed then re-assigned), this query may return the OLD failed agent instead of the CURRENT running agent, because SQLite returns rows in insertion order by default. STEPS: 1. Create run with buildplan containing 1 module 'mod-a'. 2. Insert agent-1 for mod-a with status=failed. 3. Insert agent-2 for mod-a with status=running (retry). 4. GET /api/runs/:id/modules. EXPECTED: agentStatus='running' (from agent-2). ACTUAL: May return agentStatus='failed' (from agent-1). FIX: Add ORDER BY created_at DESC before LIMIT 1.