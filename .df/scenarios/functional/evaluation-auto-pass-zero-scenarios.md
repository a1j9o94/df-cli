---
name: evaluation-auto-pass-zero-scenarios
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP4CTPZP9ST0PFF7AQAEEB4
---

SCENARIO: Evaluation phase should not auto-pass when zero scenarios exist

PRECONDITIONS:
- Pipeline run reaches evaluate-functional phase
- .df/scenarios/functional/ directory is empty (0 .md files)

STEPS:
1. Engine calls runEvaluation with empty scenarioIds array
2. Observe the evaluation result

EXPECTED:
- Evaluation should FAIL with score 0.0 and message about no scenarios
- Should NOT auto-pass with score 1.0

PASS CRITERIA:
- Zero scenarios -> evaluation-failed event, not evaluation-passed
- FAIL if evaluator returns passed:true when scenarioIds is empty