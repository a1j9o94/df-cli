---
name: types-use-boolean-skip-change-eval-not-string-mode
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Scenario: Type definitions use boolean skip_change_eval instead of string mode

### Preconditions:
- TypeScript compiles without errors

### Test Steps:
1. Read src/types/run.ts and verify:
   a. RunRecord has 'skip_change_eval: boolean' (was 'mode: "quick" | "thorough"')
   b. RunCreateInput has 'skip_change_eval?: boolean' (was 'mode?: "quick" | "thorough"')
   c. No references to 'quick' or 'thorough' string literals remain
2. Read src/types/config.ts and verify:
   a. DfConfig.build has 'skip_change_eval: boolean' (was 'default_mode: "quick" | "thorough"')
   b. DEFAULT_CONFIG.build has 'skip_change_eval: false' (was 'default_mode: "thorough"')
   c. No references to 'quick' or 'thorough' string literals remain

### Expected:
- All type references to mode: 'quick'|'thorough' are replaced with skip_change_eval: boolean
- Default is false (equivalent to old 'thorough' default — don't skip)

### Pass/Fail Criteria:
- PASS: Types use boolean skip_change_eval, no 'quick'/'thorough' literals in type files
- FAIL: Old mode types remain, or skip_change_eval is not boolean, or default is wrong
