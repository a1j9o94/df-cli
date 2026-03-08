---
name: instruction-context-402-lines-zero-production-imports
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7T4F32F6SA6R6BNRB2HGS2
---

CHANGEABILITY SCENARIO: src/pipeline/instruction-context.ts is 402 lines exporting 3 gather functions (gatherIntegrationTesterContext, gatherEvaluatorContext, gatherMergerContext) and 3 interfaces (IntegrationTesterContext, EvaluatorContext, MergerContext). Zero production files import any of them. instructions.ts builds all role prompts with inline strings. Only tests/instruction-context.test.ts imports from this module. PASS if at least 1 gather function is imported and called by instructions.ts or engine.ts. FAIL if zero production imports exist.