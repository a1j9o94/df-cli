---
name: 80-percent-budget-warning
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## 80% budget warning

### Preconditions
- Dark Factory project with a build in progress
- Budget set to $10.00

### Steps
1. Start build: dark build <spec-id> --budget-usd 10
2. Monitor console output as cost increases past ~$8.00

### Expected Results
- When cost crosses 80% ($8.00 of $10.00), a visible warning is logged
- Warning message format: '[dark] Budget warning: $X.XX of $10.00 spent (80%). Build will pause at $10.00.'
- The warning is logged ONCE per threshold crossing, not on every heartbeat
- A 'budget-warning' event is created in the events table
- If notifications are configured, a budget-warning notification is sent
- The build CONTINUES past the 80% mark — warning is informational only
- The build does NOT pause at 80%

### Pass Criteria
- Console output contains exactly ONE budget warning message (not repeated)
- Event query: SELECT COUNT(*) FROM events WHERE run_id = <run-id> AND type = 'budget-warning' returns 1
- After warning, build continues to run (status remains 'running')
- Build only pauses when cost reaches 100% of budget