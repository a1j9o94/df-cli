---
name: server-module-agent-query-uses-db-queries-module
type: change
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRDYQ38GMEC977XGSYRYG6C
---

CHANGEABILITY SCENARIO: handleGetModules in server.ts still uses inline SQL for the module agent lookup instead of delegating to getLatestAgentPerModule from db/queries/agent-queries.ts.

CURRENT STATE:
- server.ts line 367: SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at DESC LIMIT 1
- db/queries/agent-queries.ts exports getLatestAgentPerModule() which does the same thing but with a JOIN-based approach
- db/queries/status-queries.ts exports getModuleProgress() which also fetches latest agent per module

ISSUE:
- The same 'get latest agent per module' logic exists in 3 places: server.ts, agent-queries.ts, status-queries.ts
- Changing the logic (e.g. adding rowid tiebreaker) requires updating all 3

PASS CRITERIA:
- PASS if server.ts delegates to agent-queries or status-queries for module agent lookups
- FAIL if server.ts has its own inline SQL for this purpose