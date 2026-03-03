---
name: test-files-updated-to-skip-change-eval
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT2RVK2DZQZYR3JBMKG2VSC
---

## Scenario: All test files use skip_change_eval instead of mode quick/thorough

### Test Steps:
1. Search tests/ for 'mode: .quick.' and 'mode: .thorough.' — should find ZERO matches
2. Search tests/ for seed data inserting 'quick' or 'thorough' into runs table — should find ZERO matches
3. Verify tests/unit/pipeline/phases.test.ts tests shouldSkipPhase with skip_change_eval: true/false instead of mode: 'quick'/'thorough'
4. Verify tests/unit/db/queries/runs.test.ts tests createRun with skip_change_eval: true instead of mode: 'quick'

### Expected:
- All test mode references converted to skip_change_eval boolean pattern
- Test seed data uses INTEGER 0/1 instead of TEXT 'quick'/'thorough'

### Pass/Fail Criteria:
- PASS: Zero 'quick'/'thorough' mode references in tests, replaced with skip_change_eval pattern
- FAIL: Any test still uses old mode pattern