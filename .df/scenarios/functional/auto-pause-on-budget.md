---
name: auto-pause-on-budget
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Auto-pause on budget limit

### Preconditions
- Dark Factory project initialized with database
- A spec exists that will trigger a multi-module build

### Steps
1. Start a build with a low budget: dark build <spec-id> --budget-usd 2
2. Let the build run until cost exceeds ~$2

### Expected Results
- Run status transitions to 'paused' (NOT 'failed')
- runs.status = 'paused' in the database
- runs.paused_at is set to a valid ISO timestamp
- runs.pause_reason = 'budget_exceeded'
- Console output includes: 'Run paused: budget $2.00 reached'
- Console output includes: 'Resume with: dark continue <run-id> --budget-usd'
- A 'run-paused' event is created in the events table with run_id, cost, and reason='budget_exceeded'
- Agent worktrees are NOT cleaned up (still exist on disk)
- Agent records are NOT deleted from the database
- The run is NOT archived

### Pass Criteria
- Database query: SELECT status, paused_at, pause_reason FROM runs WHERE id = <run-id> returns status='paused', non-null paused_at, pause_reason='budget_exceeded'
- Event query: SELECT * FROM events WHERE run_id = <run-id> AND type = 'run-paused' returns exactly 1 row
- The run does NOT appear in failed runs list