---
name: evaluator-rejects-empty-scenarios
type: functional
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Test: Evaluator rejects when no scenarios to evaluate

### Preconditions
- A pipeline run exists with status 'running'
- All scenario files have been removed from .df/scenarios/functional/ and .df/scenarios/change/ (or were never created)
- The pipeline has reached the evaluate-functional or evaluate-change phase

### Steps
1. Clear all .md files from .df/scenarios/functional/ and .df/scenarios/change/
2. Trigger the evaluation phase (evaluate-functional)
3. Observe evaluator behavior

### Expected Results
- The evaluator does NOT auto-pass with score 1.0
- The evaluator fails with a clear error message: 'No scenarios to evaluate'
- The evaluation result shows passed: false
- An 'evaluation-failed' event is created (not 'evaluation-passed')
- The pipeline does NOT proceed to merge phase

### Pass/Fail Criteria
- PASS: Evaluator fails explicitly with 'No scenarios to evaluate' message, does not auto-pass
- FAIL: Evaluator returns score 1.0 and passed: true with zero scenarios, or evaluator proceeds silently