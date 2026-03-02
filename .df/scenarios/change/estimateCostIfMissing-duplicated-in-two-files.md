---
name: estimateCostIfMissing-duplicated-in-two-files
type: change
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ6TWKN08G27EV0C7MWFTZ2
---

CHANGEABILITY SCENARIO: estimateCostIfMissing() is duplicated in TWO files — build-phase.ts line 86 and agent-lifecycle.ts line 65. Both contain identical logic (elapsed time * 0.05 heuristic). Changing the cost estimation formula requires updating BOTH files. This is a DRY violation that increases change effort and risk of inconsistency. VERIFICATION: 1. Read src/pipeline/build-phase.ts line 86-98. 2. Read src/pipeline/agent-lifecycle.ts line 65-77. 3. Both contain: Math.max(0.01, elapsedMin * 0.05) and Math.round(elapsedMin * 4000). PASS CRITERIA: PASS if estimateCostIfMissing exists in exactly ONE location (exported and reused). FAIL (expected) if the function is duplicated.