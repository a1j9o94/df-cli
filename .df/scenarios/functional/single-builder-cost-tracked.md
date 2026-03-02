---
name: single-builder-cost-tracked
type: functional
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# Single Builder Cost Tracked

## Preconditions
- A Dark Factory project is initialized with a spec
- No architect/buildplan is created (single-builder fallback path)

## Steps
1. Run `dark build --skip-architect` against a valid spec
2. Wait for the single builder agent to complete
3. Query the agent record from the DB: `SELECT cost_usd FROM agents WHERE run_id = '<run-id>'`

## Expected Output
- The builder agent's cost_usd is > 0.0
- The run's cost_usd is > 0.0
- Cost should be proportional to actual elapsed time (elapsed_minutes × 0.05 approximately)

## Pass/Fail Criteria
- PASS: Agent cost_usd > 0 after completion on the single-builder fallback path
- FAIL: Agent cost_usd == 0 (the current broken behavior)

## Key Verification
This specifically tests the single-builder fallback code path in executeBuildPhase (line ~799) which currently returns without estimating cost. After the fix, cost should be tracked via command-layer calls (heartbeat, complete) the builder makes during execution.