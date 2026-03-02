---
name: add-agent-history-to-module
type: change
spec_id: run_01KJNH14DGMNSTJH5EJVY17TQ9
created_by: agt_01KJNH14DHP9J33BQJ5KW6S6ZM
---

Changeability test: It should be straightforward to extend the modules API to show all agent attempts for a module.

MODIFICATION:
Add an 'attempts' array to the ModuleStatus interface and response, showing all agents that have been assigned to a module (ordered by created_at ASC), each with their status, cost, elapsed time, and error (if failed).

EXPECTED CHANGES:
1. Add 'attempts' field to ModuleStatus interface in src/dashboard/server.ts
2. In handleGetModules(), change the single agent lookup to a multi-row query:
   SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at ASC
3. Map each row to a lightweight attempt summary: { id, status, cost, tokens, elapsed, error? }
4. The existing agentStatus/cost/tokens/tddPhase fields continue to reflect the LATEST agent

AFFECTED AREAS:
- src/dashboard/server.ts: ModuleStatus interface + handleGetModules()
- tests/unit/dashboard/server.test.ts: Add test for attempts array

EXPECTED EFFORT:
- Should be achievable by changing ~15-25 lines of code
- No new files needed
- No schema changes needed (agents table already has all required columns)
- The query change is a relaxation (remove LIMIT 1, keep ORDER BY created_at)

VERIFICATION:
- The change should NOT break existing fields on ModuleStatus
- Existing tests should still pass (agentStatus etc. still reflect latest)
- New test: verify attempts array has correct length and order for a module with 2 agents