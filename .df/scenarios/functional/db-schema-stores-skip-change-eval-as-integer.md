---
name: db-schema-stores-skip-change-eval-as-integer
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Scenario: DB schema uses skip_change_eval INTEGER column, not mode TEXT

### Preconditions:
- Schema can be applied to a fresh database

### Test Steps:
1. Read src/db/schema.ts and verify:
   a. The runs table has 'skip_change_eval INTEGER NOT NULL DEFAULT 0' (was 'mode TEXT NOT NULL DEFAULT thorough')
   b. No 'mode' column in the runs table definition
2. Read src/db/queries/runs.ts and verify:
   a. createRun uses skip_change_eval (boolean → 0/1 integer) instead of mode string
   b. The INSERT statement writes skip_change_eval integer value
   c. Default value when not provided is 0 (false, equivalent to old 'thorough')

### Expected:
- Fresh databases get skip_change_eval INTEGER column
- createRun correctly converts boolean to integer for storage
- getRun correctly reads integer back as boolean-compatible value

### Pass/Fail Criteria:
- PASS: DB schema uses INTEGER skip_change_eval, queries write/read correctly
- FAIL: Old mode TEXT column remains, or integer conversion is wrong
