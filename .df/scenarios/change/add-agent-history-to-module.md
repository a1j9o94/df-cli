---
name: add-agent-history-to-module
type: change
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRD336E2WR8VT2VHPW6XR1E
---

CHANGEABILITY SCENARIO: Add agent history to module card (show all attempts, not just latest).

MODIFICATION DESCRIPTION:
Extend the /api/runs/:id/modules endpoint to optionally return the full agent history for each module, showing all attempts (e.g., 'Attempt 1: failed, Attempt 2: running').

CHANGE REQUIRED:
1. In handleGetModules() in src/dashboard/server.ts, change the agent query from:
   SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at DESC LIMIT 1
   To a query that returns ALL agents for the module:
   SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at ASC
2. Add an optional 'agentHistory' field to the ModuleStatus interface:
   agentHistory?: Array<{ id: string; status: string; cost: number; elapsed: string; createdAt: string; error?: string }>
3. Map all agent rows into the agentHistory array
4. Keep using the first row (most recent via DESC, or last via ASC) for the primary agentStatus/cost/tokens fields

AFFECTED AREAS:
- src/dashboard/server.ts: ModuleStatus interface, handleGetModules() function
- tests/unit/dashboard/server.test.ts: Add test for agentHistory field
- Dashboard UI (src/dashboard/index.ts): Would need UI update to render history (not in scope of this change assessment)

EXPECTED EFFORT:
- Low (~30 minutes): The data is already in the DB, just needs a query change from LIMIT 1 to returning all rows
- The existing ORDER BY created_at DESC pattern (from the primary fix) makes this trivial
- Interface change is additive (optional field), so backward compatible

ASSESSMENT CRITERIA:
- Can this change be made by modifying only handleGetModules() and the ModuleStatus interface?
- Does the existing code structure (module-agent lookup pattern) support this without refactoring?
- Is the change backward compatible (existing consumers still work)?

EXPECTED ANSWER: Yes to all three. The fix in this spec (adding ORDER BY created_at DESC) naturally sets up for this extension by making the query pattern explicit about ordering.