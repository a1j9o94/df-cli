---
name: evaluator-rejects-zero-scenarios
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Scenario: Evaluator rejects empty scenarios

### Preconditions
- A Dark Factory project is initialized
- A run has completed the build phase
- All scenario files have been deleted from `.df/scenarios/functional/` and `.df/scenarios/change/`
- An evaluator agent is spawned

### Steps
1. Clear all .md files from `.df/scenarios/functional/` and `.df/scenarios/change/`
2. The evaluator agent attempts to complete (calls `dark agent complete`)
3. The completion guard checks for scenario files on disk

### Expected Results
- The evaluator's completion guard detects 0 scenario files on disk
- The evaluator is rejected from completing
- Error message contains: 'No scenarios to evaluate'
- The evaluator does NOT auto-pass with score 1.0
- Process exits with non-zero exit code

### Pass/Fail Criteria
- PASS: Evaluator completion is rejected with 'No scenarios to evaluate' error message
- FAIL: Evaluator completes successfully with score 1.0, OR error message is missing/unclear