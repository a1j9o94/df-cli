---
name: skip-change-eval-flag-skips-evaluate-change-phase
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Scenario: --skip-change-eval flag causes evaluate-change phase to be skipped

### Preconditions:
- Dark Factory project initialized
- A spec exists

### Test Steps:
1. In src/pipeline/phases.ts, verify shouldSkipPhase('evaluate-change', { skip_change_eval: true }) returns true
2. In src/pipeline/phases.ts, verify shouldSkipPhase('evaluate-change', { skip_change_eval: false }) returns false
3. In src/pipeline/phases.ts, verify shouldSkipPhase('evaluate-change', {}) returns false (default behavior)

### Expected:
- When skip_change_eval is true in the context, evaluate-change phase is skipped
- When skip_change_eval is false or absent, evaluate-change phase is NOT skipped
- No other phases are affected by skip_change_eval

### Pass/Fail Criteria:
- PASS: shouldSkipPhase correctly handles boolean skip_change_eval instead of string mode
- FAIL: shouldSkipPhase still references mode === 'quick' or does not handle skip_change_eval
