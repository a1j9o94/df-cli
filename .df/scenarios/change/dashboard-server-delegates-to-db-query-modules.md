---
name: dashboard-server-delegates-to-db-query-modules
type: change
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRF2AKE3XX8RTG4QZ2K7KXT
---

CHANGE SCENARIO: server.ts handleGetModules should delegate agent lookup to db/queries/agent-queries.ts instead of inline SQL.

CURRENT STATE:
- server.ts line 367: Inline SQL 'SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at DESC LIMIT 1'
- db/queries/agent-queries.ts: getLatestAgentPerModule() with JOIN-based approach including rowid tiebreaker
- db/queries/status-queries.ts: getModuleProgress() also has its own latest-agent-per-module query

ISSUE:
- Same 'get latest agent per module' logic duplicated in 3 locations
- If logic changes (e.g., adding rowid tiebreaker), must update 3 files
- server.ts does NOT import or use any db query modules

MODIFICATION:
1. Import getLatestAgentPerModule from db/queries/agent-queries.ts
2. Replace inline SQL with call to getLatestAgentPerModule
3. Or create shared function used by all 3 locations

PASS CRITERIA:
- PASS: server.ts delegates module agent lookups to shared query module
- FAIL: server.ts still contains its own inline SQL for module agent lookup