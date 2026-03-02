---
name: cost-increments-on-heartbeat
type: functional
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# Cost Increments on Heartbeat

## Preconditions
- A Dark Factory project is initialized
- An agent exists in 'running' status with a known created_at timestamp

## Steps
1. Create/spawn an agent (record its agent ID and created_at)
2. Wait 30 seconds
3. Call `dark agent heartbeat <agent-id>`
4. Record agent.cost_usd as cost_after_hb1
5. Wait 30 seconds
6. Call `dark agent heartbeat <agent-id>`
7. Record agent.cost_usd as cost_after_hb2
8. Wait 30 seconds
9. Call `dark agent heartbeat <agent-id>`
10. Record agent.cost_usd as cost_after_hb3

## Expected Output
- cost_after_hb1 > 0 (approx 30s × $0.05/min = ~$0.025)
- cost_after_hb2 > cost_after_hb1 (increment should be ~$0.025, NOT cumulative from creation)
- cost_after_hb3 > cost_after_hb2 (another ~$0.025 increment)
- Each increment should be approximately equal (within 20% tolerance) since intervals are equal
- Total cost_after_hb3 should be approximately 90s × $0.05/min = ~$0.075

## Pass/Fail Criteria
- PASS: cost increases after each heartbeat AND increments are proportional to elapsed time between calls (not cumulative from creation)
- FAIL: cost stays at 0, or increments are cumulative from creation time, or increments are not proportional to elapsed time

## Key Verification
The delta computation must use time-since-last-update (last_heartbeat or last_cost_update), not time-since-creation. This ensures idempotency — rapid successive calls produce small increments, not large ones.