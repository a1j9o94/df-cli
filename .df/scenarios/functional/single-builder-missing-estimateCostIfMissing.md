---
name: single-builder-missing-estimateCostIfMissing
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ61PK9FQEVPTC780QYZBRS
---

SCENARIO: In executeBuildPhase (src/pipeline/build-phase.ts), when no buildplan exists and a single builder is spawned (lines 157-188), the function returns immediately after waitForAgent() without calling estimateCostIfMissing(). This means single-builder runs never get cost estimates if the builder doesn't self-report via heartbeat. STEPS: 1. Create a run with no buildplan. 2. Execute build phase (triggers single-builder fallback). 3. Complete the builder without reporting cost. 4. Check agent.cost_usd. EXPECTED: agent.cost_usd > 0 (estimated from elapsed time). ACTUAL: agent.cost_usd == 0. FIX: Add estimateCostIfMissing() call after waitForAgent() in the single-builder path, matching the pattern in executeAgentPhase (agent-lifecycle.ts line 140).