---
name: integrate-phase-uses-evaluator-prompt-not-integration-prompt
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK7368XBFB069N1WH5008E65
---

CHANGE SCENARIO: engine.ts line 375 uses getEvaluatorPrompt for the 'integrate' phase instead of a dedicated getIntegrationTesterPrompt. The integrate phase spawns role 'integration-tester' but gives it evaluator instructions with mode:'functional'. This conflates two distinct roles. VERIFICATION: grep -n 'getEvaluatorPrompt' src/pipeline/engine.ts shows line 376 is in the 'integrate' case block. PASS CRITERIA: integrate phase uses a dedicated prompt function for integration testing. FAIL CRITERIA: integrate phase reuses getEvaluatorPrompt.