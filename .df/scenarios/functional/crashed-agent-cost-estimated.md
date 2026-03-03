---
name: crashed-agent-cost-estimated
type: functional
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

SCENARIO: When an agent crashes (PID dies without calling complete/fail), the engine estimates final cost from time since last heartbeat.

PRECONDITIONS:
- A Dark Factory project is initialized
- An agent is spawned and running

STEPS:
1. Spawn an agent. It calls `dark agent heartbeat <id>` once. Note agent.cost_usd after heartbeat (call it cost_at_hb).
2. Wait some time (e.g. 30 seconds).
3. Kill the agent's PID (simulate crash).
4. The engine detects the crashed agent (PID dead, no complete/fail call).
5. Query agent.cost_usd after engine crash detection.

EXPECTED:
- agent.cost_usd > cost_at_hb (engine added a final cost increment)
- The increment covers the gap between last heartbeat and crash detection time
- The engine calls estimateAndRecordCost for the crashed agent

VERIFICATION (code-level):
- In build-phase.ts: when runtimeStatus is 'stopped' and agent didn't call complete/fail, estimateAndRecordCost is called before marking agent as failed
- In agent-lifecycle.ts waitForAgent: when PID is dead and agent didn't call complete/fail, estimateAndRecordCost is called
- This is the ONLY place the engine estimates cost — all other cost tracking is in the command layer

PASS CRITERIA:
- Crashed agent has cost_usd > 0 (includes both heartbeat-reported cost and engine-estimated final gap)
- Engine only estimates cost for crashed agents, not for agents that called complete/fail normally

FAIL CRITERIA:
- Crashed agent has cost_usd == 0 or only the heartbeat cost (gap not covered)
- Engine still has estimateCostIfMissing function (should be removed)