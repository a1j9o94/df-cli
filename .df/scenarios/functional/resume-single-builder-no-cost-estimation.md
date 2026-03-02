---
name: resume-single-builder-no-cost-estimation
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQP5BA25VFN8JV1EKCK0WK1
---

SCENARIO: Both executeBuildPhase and executeResumeBuildPhase have a single-builder fallback path (no buildplan). Neither path calls estimateCostIfMissing() after the builder completes. This means single-builder runs always show cost_usd=0 even though time elapsed. STEPS: 1. Trigger a build with no buildplan (single builder path) 2. Let builder complete 3. Check agent.cost_usd. PASS CRITERIA: agent.cost_usd > 0 after single builder completes. FAIL if cost_usd == 0.