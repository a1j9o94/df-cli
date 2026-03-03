---
name: cost-increments-on-heartbeat
type: functional
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

SCENARIO: Cost increases incrementally on each heartbeat, proportional to elapsed time (not cumulative from creation).

PRECONDITIONS:
- A Dark Factory project is initialized
- An agent exists in 'running' status with created_at set to a known time
- The agent has NOT self-reported cost via --cost flag

STEPS:
1. Create an agent record (via createAgent or dark build). Note created_at timestamp.
2. Wait 30 seconds. Agent calls `dark agent heartbeat <id>` (no --cost flag).
3. Query agent.cost_usd. Record as cost_after_hb1.
4. Wait 30 seconds. Agent calls `dark agent heartbeat <id>` again (no --cost flag).
5. Query agent.cost_usd. Record as cost_after_hb2.
6. Wait 30 seconds. Agent calls `dark agent heartbeat <id>` again (no --cost flag).
7. Query agent.cost_usd. Record as cost_after_hb3.

EXPECTED:
- cost_after_hb1 > 0 (approximately 0.5 min * $0.05/min = $0.025)
- cost_after_hb2 > cost_after_hb1 (increment ~ $0.025, NOT cumulative from creation)
- cost_after_hb3 > cost_after_hb2 (increment ~ $0.025)
- Each increment should be roughly equal (proportional to ~30s elapsed between calls)
- Total cost_after_hb3 should be approximately $0.075 (1.5 min * $0.05/min), NOT $0.025 + $0.05 + $0.075

PASS CRITERIA:
- Each heartbeat increases cost_usd
- Increments are roughly proportional to elapsed time between heartbeats (not time since creation)
- delta_2 ≈ delta_1 (within 50% tolerance for timing jitter)

FAIL CRITERIA:
- cost_usd stays at 0 after heartbeats
- Increments grow linearly (suggesting cumulative-from-creation rather than incremental)
- Double-counting: cost grows much faster than expected