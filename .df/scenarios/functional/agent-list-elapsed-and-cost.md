---
name: agent-list-elapsed-and-cost
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark agent list shows elapsed time and estimated cost for running agents.

SETUP:
1. Create an in-memory test DB using getDbForTest()
2. Create a run: createRun(db, { spec_id: 'spec_test' })
3. Create a running builder agent with known created_at ~12m 34s ago (Date.now() - 754000):
   createAgent(db, { agent_id: '', run_id: runId, role: 'builder', name: 'builder-foo', module_id: 'foo', worktree_path: '/tmp/foo', system_prompt: 'p' })
4. Set agent cost: updateAgentCost(db, agent.id, 0.62, 5000)
5. Set agent PID: updateAgentPid(db, agent.id, 12345)

VERIFICATION:
- Call formatAgentListEntry(agent) from src/utils/format-agent-list.ts
- Output MUST contain '12m 34s' (elapsed time in human-readable format)
- Output MUST contain '$0.62' (estimated cost with dollar sign)
- Output MUST contain 'running' (agent status)
- Both values must appear on the FIRST line of output (the main info line)

PASS CRITERIA:
- Elapsed time appears in 'Xm Ys' format for a running agent
- Cost appears as '~$X.XX' format
- For a completed agent with total_active_ms=300000, elapsed shows '5m 0s' (uses total_active_ms, not created_at)