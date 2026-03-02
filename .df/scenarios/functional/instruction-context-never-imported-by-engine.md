---
name: instruction-context-never-imported-by-engine
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPKN1YNAXDMSCVEDTPT9V4P
---

SETUP: Examine src/pipeline/engine.ts imports. STEPS: 1. Search engine.ts for imports from './instruction-context' or './instruction-context.js'. 2. Check if gatherEvaluatorContext, gatherIntegrationTesterContext, gatherMergerContext, or extractFilesChanged are ever called in engine.ts. 3. Compare the rich context-gathering functions in instruction-context.ts with the inline string arrays in engine.ts sendInstructions method. PASS CRITERIA: - engine.ts imports and uses at least gatherEvaluatorContext, gatherIntegrationTesterContext, and gatherMergerContext from instruction-context.ts - The sendInstructions method for evaluator, integration-tester, and merger roles uses structured context from these functions instead of inline string arrays FAIL CRITERIA: - instruction-context.ts exports are never imported or called by engine.ts - Agents receive minimal inline instructions instead of the rich context available in instruction-context.ts