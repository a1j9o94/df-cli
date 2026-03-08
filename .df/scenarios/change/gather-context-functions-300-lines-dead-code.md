---
name: gather-context-functions-300-lines-dead-code
type: change
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5QSCQ40PCWYRANGB212A2V
---

CHANGE SCENARIO: instruction-context.ts contains ~300 lines of dead code: gatherIntegrationTesterContext, gatherEvaluatorContext, and gatherMergerContext functions plus their interfaces. These are exported but never imported or called by any other module. engine.ts uses inline strings instead. VERIFICATION: grep for function names outside instruction-context.ts. PASS: Functions are called by sendInstructions() or engine.ts. FAIL: Functions are never referenced outside their definition file.