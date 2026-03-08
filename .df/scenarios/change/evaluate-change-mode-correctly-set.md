---
name: evaluate-change-mode-correctly-set
type: change
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7M1CWFVCEJ0GX143ASJYM3
---

Verification: engine.ts evaluate-functional case (line 388) passes mode:'functional' and evaluate-change case (line 400) passes mode:'change' to getEvaluatorPrompt. Both modes are correctly differentiated. PASS if evaluate-change uses mode:'change'. FAIL if both use mode:'functional'. Expected: PASS.