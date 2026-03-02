---
name: module-agent-lookup-nondeterministic
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: handleGetModules returns nondeterministic agent data for retried modules

PRECONDITIONS:
- A module has been retried: first agent failed, second agent is running
- Both agents have the same module_id

STEPS:
1. Insert 2 agents for same module_id: first status=failed, second status=running  
2. GET /api/runs/:id/modules

CODE PATH:
- server.ts handleGetModules line ~367: SELECT * FROM agents WHERE run_id = ? AND module_id = ? LIMIT 1
- This query has NO ORDER BY clause

EXPECTED:
- Module card shows the LATEST agent data (running status, not failed)
- Query should be: ORDER BY created_at DESC LIMIT 1

PASS CRITERIA:
- agentStatus reflects the most recently created agent
- FAIL if query returns arbitrary agent (nondeterministic due to missing ORDER BY)