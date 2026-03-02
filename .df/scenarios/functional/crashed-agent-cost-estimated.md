---
name: crashed-agent-cost-estimated
type: functional
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# Crashed Agent Cost Estimated

## Preconditions
- A Dark Factory project is initialized with a run
- The engine is running and monitoring agents

## Steps
1. Spawn a builder agent (record agent ID and PID)
2. Let the agent send one heartbeat (cost recorded for first interval)
3. Wait 60 seconds after heartbeat
4. Kill the agent PID: `kill -9 <pid>`
5. Wait for the engine to detect the crash (PID liveness check loop)
6. Query agent record from DB

## Expected Output
- Agent status is 'failed' with error about process exiting
- Agent cost_usd > 0
- Agent cost_usd includes cost for the time between last heartbeat and crash detection
- Specifically: cost should cover (crash_detection_time - last_heartbeat_time) × cost_per_minute
- If heartbeat was at T=30s and crash detected at T=90s, cost covers both 0-30s (from heartbeat) and 30-90s (from engine crash estimation)

## Pass/Fail Criteria
- PASS: Crashed agent has cost_usd > 0 covering the full time from last heartbeat to crash detection
- FAIL: Crashed agent has cost_usd == 0, or only has cost up to the last heartbeat (missing the gap)

## Key Verification
This is the ONLY place the engine should estimate cost. When PID is dead and agent didn't call complete/fail, the engine calls estimateAndRecordCost one final time for the gap between last heartbeat and crash detection. Check engine.ts at the PID-dead code paths (~line 446, ~952, ~1019).