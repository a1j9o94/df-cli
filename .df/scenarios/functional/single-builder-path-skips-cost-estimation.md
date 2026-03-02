---
name: single-builder-path-skips-cost-estimation
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPKN1YNAXDMSCVEDTPT9V4P
---

SETUP: Examine executeBuildPhase() in engine.ts for single-module builds. STEPS: 1. In engine.ts, find executeBuildPhase() and locate the single-builder fallback path (when there is only one module). 2. Check if estimateCostIfMissing() is called after the single builder completes. 3. Compare with the multi-module path and executeAgentPhase() which DO call estimateCostIfMissing(). PASS CRITERIA: - estimateCostIfMissing() is called after the single builder completes, consistent with multi-module and other agent phases FAIL CRITERIA: - The single-builder path returns after waitForAgent() without calling estimateCostIfMissing() - Cost for single-module builds is always 0 unless the agent self-reports via --cost flag - This creates an inconsistency where single-module builds have no cost estimate but multi-module builds do