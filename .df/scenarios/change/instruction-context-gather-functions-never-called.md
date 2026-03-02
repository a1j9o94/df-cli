---
name: instruction-context-gather-functions-never-called
type: change
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQPSYMK3FZ6E1ZPBBKYXYG0
---

CHANGEABILITY SCENARIO: instruction-context.ts exports 3 context-gathering functions (gatherIntegrationTesterContext, gatherEvaluatorContext, gatherMergerContext) but NONE are imported or called by instructions.ts or engine.ts. The structured context module was built but never wired into the instruction delivery pipeline. VERIFICATION: grep for gatherIntegrationTesterContext|gatherEvaluatorContext|gatherMergerContext outside instruction-context.ts — returns 0 results. PASS CRITERIA: PASS if all 3 gather functions are called by sendInstructions to compose structured role-specific instructions. FAIL (expected) if none of the 3 functions are referenced outside their defining module.