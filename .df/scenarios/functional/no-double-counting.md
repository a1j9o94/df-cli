---
name: no-double-counting
type: functional
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

SCENARIO: Rapid successive calls (heartbeat then immediately complete) do not double-count the same time period.

PRECONDITIONS:
- A Dark Factory project is initialized
- An agent exists in 'running' status

STEPS:
1. Create an agent. Wait 60 seconds (to accumulate meaningful elapsed time).
2. Agent calls `dark agent heartbeat <id>` (no --cost flag). estimateAndRecordCost runs.
3. Query agent.cost_usd immediately. Record as cost_after_hb.
4. Immediately (within 1 second) agent calls `dark agent complete <id>` (no --cost flag). estimateAndRecordCost runs again.
5. Query agent.cost_usd. Record as cost_after_complete.

EXPECTED:
- cost_after_hb ≈ 60s * $0.05/min ≈ $0.05
- cost_after_complete ≈ cost_after_hb + tiny delta (near-zero, covering only the ~1s between heartbeat and complete)
- cost_after_complete should NOT be ≈ 2 * cost_after_hb (that would indicate double-counting)

VERIFICATION:
- estimateAndRecordCost uses time since last update (updated_at), not time since creation
- After heartbeat records cost, updated_at is bumped to now
- The immediate complete call sees near-zero elapsed time since updated_at
- Therefore the second estimation adds near-zero cost

PASS CRITERIA:
- (cost_after_complete - cost_after_hb) < 0.01 (less than 1 cent for the ~1s gap)
- Total cost is approximately what you'd expect for 60 seconds, not 120 seconds

FAIL CRITERIA:
- cost_after_complete ≈ 2 * cost_after_hb (double-counting: both calls measured from creation)
- estimateAndRecordCost uses created_at instead of updated_at/last_heartbeat