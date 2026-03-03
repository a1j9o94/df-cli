---
name: gather-context-functions-dead-code
type: change
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJT3FHY2TEZNJCJVRPW3W1QS
---

CHANGEABILITY SCENARIO: instruction-context.ts exports 3 comprehensive context-gathering functions (gatherIntegrationTesterContext, gatherEvaluatorContext, gatherMergerContext) but none are imported or called anywhere in the codebase. Engine.ts and instructions.ts use inline strings instead. This represents ~300 lines of dead code that increases maintenance burden. VERIFICATION: grep -rn 'gatherIntegrationTesterContext\|gatherEvaluatorContext\|gatherMergerContext' src/ shows only instruction-context.ts. PASS CRITERIA: PASS if at least one gather function is imported and used by engine.ts or instructions.ts. FAIL if all 3 gather functions remain unused.