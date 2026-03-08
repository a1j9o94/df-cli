---
name: gather-context-functions-unused-by-instruction-pipeline
type: change
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6V31S8AAGMYDQV0RA43AWE
---

CHANGE SCENARIO: Context gather functions in instruction-context.ts are dead code

DESCRIPTION: instruction-context.ts defines gatherEvaluatorContext(), gatherIntegrationTesterContext(), and gatherMergerContext() with proper interfaces (EvaluatorContext, IntegrationTesterContext, MergerContext). However, instructions.ts buildEvaluatorBody(), buildIntegrationTesterBody(), and buildMergerBody() all use inline string construction instead of calling these gather functions. The structured context pipeline is disconnected.

VERIFICATION:
1. grep for gatherEvaluatorContext, gatherIntegrationTesterContext, gatherMergerContext in all files except instruction-context.ts
2. Should find zero references outside the definition file
3. instructions.ts should NOT import any of these functions

PASS CRITERIA:
- sendInstructions() calls the appropriate gather function for each role
- The structured context (EvaluatorContext, etc.) is passed to instruction body builders
- Or: the dead gather functions are removed entirely

FAIL CRITERIA:
- Gather functions exist but are never called outside instruction-context.ts
- Instructions use inline string builders that duplicate the context-gathering logic