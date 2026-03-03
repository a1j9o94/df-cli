---
name: cli-option-renamed-from-mode-to-skip-change-eval
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Scenario: CLI option is --skip-change-eval (boolean flag), not --mode

### Preconditions:
- Dark Factory project initialized

### Test Steps:
1. Read src/commands/build.ts and verify:
   a. There is NO .option('--mode <mode>', ...) or any --mode option
   b. There IS a .option('--skip-change-eval', ...) boolean flag option
2. Verify the options type in the .action() handler includes skipChangeEval?: boolean (not mode?: string)
3. Verify the help text example in src/index.ts uses --skip-change-eval instead of --mode quick

### Expected:
- CLI accepts: dark build spec_ID --skip-change-eval
- CLI does NOT accept: dark build spec_ID --mode quick (mode option removed)
- The option is a boolean flag (no argument needed), not a string value option

### Pass/Fail Criteria:
- PASS: --mode option removed, --skip-change-eval boolean flag present, help text updated
- FAIL: --mode still exists, or --skip-change-eval is missing, or option takes a string value
