---
name: evaluator-change-mode-hardcoded-functional
type: change
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJT3FHY2TEZNJCJVRPW3W1QS
---

CHANGEABILITY SCENARIO: engine.ts evaluate-change case (line 345) passes mode:'functional' to getEvaluatorPrompt instead of mode:'change'. Both evaluate-functional (line 337) and evaluate-change (line 345) hardcode mode:'functional'. Fixing this requires changing 1 character in 1 line. VERIFICATION: grep -n 'mode.*functional' src/pipeline/engine.ts shows BOTH lines 337 and 345 use functional. PASS CRITERIA: PASS if evaluate-change phase uses mode:'change'. FAIL if both phases use mode:'functional'.