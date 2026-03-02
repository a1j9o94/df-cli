---
name: no-double-counting
type: functional
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# No Double-Counting on Rapid Successive Calls

## Preconditions
- A Dark Factory project is initialized with a run
- An agent exists in 'running' status
- Agent has been running for at least 60 seconds

## Steps
1. Create/spawn an agent, wait 60 seconds
2. Call `dark agent heartbeat <agent-id>`
3. Record agent.cost_usd as cost_after_heartbeat
4. Immediately (within 1 second) call `dark agent complete <agent-id>`
5. Record agent.cost_usd as cost_after_complete

## Expected Output
- cost_after_heartbeat > 0 (covers ~60s of elapsed time, approximately $0.05)
- cost_after_complete >= cost_after_heartbeat
- (cost_after_complete - cost_after_heartbeat) is very small (< $0.002, representing ~1 second)
- cost_after_complete is NOT approximately 2x cost_after_heartbeat (which would indicate double-counting)

## Pass/Fail Criteria
- PASS: The complete call adds only a tiny increment (~1 second worth) on top of the heartbeat cost, NOT the full elapsed time from creation
- FAIL: The complete call re-estimates from creation time, resulting in approximately double the expected cost

## Key Verification
The estimateAndRecordCost function must track the timestamp of the last cost update. When heartbeat runs at T=60s, it records cost and updates the 'last cost recorded' timestamp to T=60s. When complete runs at T=61s, it only estimates for the 1-second gap (T=61 - T=60). The function uses MAX(last_heartbeat, last_cost_update, created_at) as the reference point.