---
name: init-command-skip-when-uses-new-config-path
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT2RVK2DZQZYR3JBMKG2VSC
---

## Scenario: init.ts skip_when references updated config path

### Test Steps:
1. Read src/commands/init.ts and find the skip_when field for evaluate-change phase definition
2. Verify it references config.build.skip_change_eval (not config.build.default_mode == 'quick')

### Expected:
- skip_when: 'config.build.skip_change_eval === true' (not 'config.build.default_mode == quick')

### Pass/Fail Criteria:
- PASS: init.ts references the new config field in skip_when
- FAIL: init.ts still references default_mode or 'quick'