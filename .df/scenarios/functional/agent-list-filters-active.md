---
name: agent-list-filters-active
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark agent list --active shows only agents with live PIDs, excluding dead/completed from previous attempts.

SETUP:
1. Create test DB with getDbForTest()
2. Create run: createRun(db, { spec_id: 'spec_test' })
3. Create 4 agents for the run:
   - Agent A: role=builder, name=b-parser, status stays 'pending' (active status)
   - Agent B: role=builder, name=b-lexer, updateAgentPid(db, b.id, 12345) then status='running' (active status)
   - Agent C: role=builder, name=b-old, updateAgentStatus(db, c.id, 'completed') (NOT active)
   - Agent D: role=builder, name=b-dead, updateAgentStatus(db, d.id, 'failed') (NOT active)

VERIFICATION - DB filter:
- Call listAgentsFiltered(db, { runId, active: true })
- Result MUST include exactly 2 agents (A and B - pending and running)
- Result MUST NOT include C (completed) or D (failed)

VERIFICATION - PID filter (in list command):
- After DB filter, agents with active status are further filtered by isProcessAlive(pid)
- isProcessAlive(null) returns false (Agent A with no PID gets excluded)
- Only agents with both active DB status AND live PID remain

VERIFICATION - Default behavior:
- When calling listAgentsFiltered(db, {}) with NO run-id filter, the default behavior should show latest agent per module for the most recent run, not ALL agents from ALL runs
- Create a second run with duplicate module agents
- Default listing should show only latest agent per module from latest run

PASS CRITERIA:
- --active flag correctly excludes completed/failed/killed agents at DB level
- PID liveness check further filters to truly alive processes
- Default (no flags) shows latest per module, not historical attempts