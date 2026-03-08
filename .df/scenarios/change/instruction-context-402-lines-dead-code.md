---
name: instruction-context-402-lines-dead-code
type: change
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK7017ASDX9EKP96GZTBSZA8
---

VERIFIED FACT: src/pipeline/instruction-context.ts is 402 lines. It exports gatherIntegrationTesterContext, gatherEvaluatorContext, gatherMergerContext, and their corresponding Context interfaces (IntegrationTesterContext, EvaluatorContext, MergerContext). NONE of these are imported or called by any other file. instructions.ts and engine.ts use inline string construction instead. The entire module is dead code. merge-sanitization.ts is also dead code (sanitizedMerge never called). merge-lock.ts DOES exist with acquireMergeLock/releaseMergeLock/waitForMergeLock functions.