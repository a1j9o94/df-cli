---
name: resume-context-uses-skip-change-eval-not-mode
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT2RVK2DZQZYR3JBMKG2VSC
---

## Scenario: Resume method passes skip_change_eval in context, not mode

### Test Steps:
1. Read src/pipeline/engine.ts resume() method
2. Find the context object construction (~line 215-220)
3. Verify context includes skip_change_eval: boolean (derived from run.skip_change_eval)
4. Verify NO mode property is passed in the context

### Expected:
- context = { skip_architect: false, skip_change_eval: run.skip_change_eval, module_count: 0 }
- No 'mode' key in context

### Pass/Fail Criteria:
- PASS: Resume context uses skip_change_eval boolean from DB record
- FAIL: Resume context still uses mode string from DB record