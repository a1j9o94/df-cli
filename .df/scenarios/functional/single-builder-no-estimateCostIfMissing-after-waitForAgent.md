---
name: single-builder-no-estimateCostIfMissing-after-waitForAgent
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRKYXN00P1MJH4Q3XXHP69B
---

SCENARIO: Both executeBuildPhase and executeResumeBuildPhase single-builder fallback paths call waitForAgent then immediately return without calling estimateCostIfMissing. STEPS: 1. Read src/pipeline/build-phase.ts. 2. Find executeBuildPhase single-builder path (lines ~185-216). 3. Verify waitForAgent is called at line 215, then 'return' at line 216. 4. Find executeResumeBuildPhase single-builder path (lines ~420-450). 5. Verify same pattern: waitForAgent then return, no estimateCostIfMissing. 6. Contrast with multi-builder path (line 335) which calls estimateCostIfMissing(db, agentRecord). PASS: Both single-builder paths call estimateCostIfMissing after waitForAgent returns. FAIL: Neither single-builder path calls estimateCostIfMissing, leaving cost_usd=0 for agents that completed via this code path.