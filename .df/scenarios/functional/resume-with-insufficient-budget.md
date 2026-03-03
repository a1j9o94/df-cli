---
name: resume-with-insufficient-budget
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Resume with insufficient budget

### Preconditions
- A run is paused with cost_usd = 14.87 and budget_usd = 15.00

### Steps
1. Run: dark continue <run-id> --budget-usd 14

### Expected Results
- The command rejects with a clear error message
- Error message: 'New budget ($14) must exceed current spend ($14.87).'
- The run remains in 'paused' state
- No 'run-resumed' event is created
- The budget_usd is NOT updated

### Pass Criteria
- Command exits with non-zero exit code
- Error message is displayed to the user containing both the new budget and current spend amounts
- SELECT status FROM runs WHERE id = <run-id> still returns 'paused'
- SELECT budget_usd FROM runs WHERE id = <run-id> still returns 15.00 (unchanged)
- No run-resumed event exists