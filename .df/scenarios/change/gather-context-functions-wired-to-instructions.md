---
name: gather-context-functions-wired-to-instructions
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify that the gather*Context functions from instruction-context.ts (gatherIntegrationTesterContext, gatherEvaluatorContext, gatherMergerContext) are actually imported and called by instructions.ts or engine.ts. PASS if at least one gather function is used in the instruction delivery pipeline. FAIL if all gather functions are orphaned (exported but never imported).