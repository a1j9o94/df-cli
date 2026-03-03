---
name: change-warning-threshold
type: change
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Change warning threshold from 80% to 90%

### Modification
Change the budget warning threshold from 80% to 90% of budget.

### Expected Effort
- Should require updating a SINGLE constant or config value
- No logic changes needed
- No test changes needed (beyond updating the expected threshold value)

### Affected Areas
- A constant (e.g., BUDGET_WARNING_THRESHOLD = 0.8 -> 0.9) in budget.ts or a dedicated constants file
- The warning message string that mentions '80%' should derive from the constant, not be hardcoded

### Verification
1. Search the codebase for the threshold value (0.8 or 80)
2. Confirm there is exactly ONE place that defines the threshold
3. Change it to 0.9
4. Verify the warning now triggers at 90% of budget
5. Verify no other behavior changes

### Pass Criteria
- The threshold is defined as a named constant (not a magic number inline)
- Changing the constant value is the ONLY edit needed
- The warning message dynamically includes the percentage (not hardcoded '80%')