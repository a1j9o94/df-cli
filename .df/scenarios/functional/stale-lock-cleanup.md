---
name: stale-lock-cleanup
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Stale Lock Cleanup: Dead PID Detection and Lock Stealing

### Preconditions
- .df/ directory exists
- No active merge in progress

### Setup Steps
1. Create a lock file at `.df/merge.lock` with content:
   ```json
   { "runId": "run_STALE", "acquiredAt": "2026-01-01T00:00:00Z", "pid": 99999 }
   ```
   where PID 99999 does not correspond to any running process
2. Verify PID 99999 is dead: `kill -0 99999` should fail

### Test Steps
1. Call `acquireMergeLock(dfDir, 'run_NEW')`
2. The function should detect the existing lock
3. It should check if PID 99999 is alive (it's not)
4. It should determine the lock is stale
5. It should steal the lock by overwriting with new run's info

### Expected Outputs
- `acquireMergeLock` returns `true` (lock acquired despite existing lockfile)
- Lock file now contains: `{ "runId": "run_NEW", "acquiredAt": <current_time>, "pid": <current_pid> }`
- Old lock data is completely replaced

### Pass/Fail Criteria
- PASS: Lock acquired successfully, stale lock detected via dead PID, new lock written
- FAIL: Function returns false (blocked by stale lock), OR hangs waiting, OR throws error, OR does not check PID liveness