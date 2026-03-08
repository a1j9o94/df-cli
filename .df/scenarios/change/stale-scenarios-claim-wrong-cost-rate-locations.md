---
name: stale-scenarios-claim-wrong-cost-rate-locations
type: change
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6FRE2SYYF08YWK5EWPH8JZ
---

CHANGE SCENARIO: Multiple existing change scenarios incorrectly claim cost rate 0.05 is inline in build-phase.ts and agent-lifecycle.ts. Actual grep shows 0.05 does NOT appear in those files — cost tracking in pipeline was refactored to use estimateAndRecordCost from budget.ts at the command layer. Scenarios claiming duplication in build-phase.ts/agent-lifecycle.ts are stale. VERIFICATION: grep '0.05' src/pipeline/build-phase.ts and src/pipeline/agent-lifecycle.ts — should return no matches for assignment (= 0.05). PASS: No inline 0.05 magic numbers exist in build-phase.ts or agent-lifecycle.ts. FAIL: 0.05 appears as inline magic number in those files.