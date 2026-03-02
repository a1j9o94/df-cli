---
name: queue-position-displayed
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Queue Position Displayed: dark status Shows Merge Queue

### Preconditions
- Three runs (Run X, Run Y, Run Z) all reach the merge phase
- Run X holds the merge lock (actively merging)
- Run Y and Run Z are queued behind X

### Setup Steps
1. Create three runs in the database, all with phase='merge' and status='running'
2. Create a lock file at `.df/merge.lock` with Run X's info (active merger)
3. Simulate Y and Z as waiting (their merger agents are in the 'pending' or 'spawning' state, waiting for lock)

### Test Steps
1. Run `dark status` (no --run-id)
2. Inspect the output for each run's merge queue position
3. Run `dark status --run-id <run_Y_id>` for specific run
4. Query the dashboard API: `GET /api/runs`

### Expected Outputs
- `dark status` output shows:
  - Run X: `phase=merge` (no queue indicator — it's the active merger)
  - Run Y: `phase=merge (queued, 1 ahead)` or similar
  - Run Z: `phase=merge (queued, 2 ahead)` or similar
- Dashboard API RunSummary includes a `mergeQueuePosition` field (or equivalent) for queued runs
- Active merger shows position 0 or null (not queued)

### Pass/Fail Criteria
- PASS: Queue positions are visible in `dark status` output AND dashboard API includes queue position data
- FAIL: No queue position shown, OR positions are incorrect, OR dashboard API missing queue data