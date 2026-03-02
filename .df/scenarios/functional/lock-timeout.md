---
name: lock-timeout
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Lock Timeout: Queued Run Fails Gracefully on Timeout

### Preconditions
- One run (Run A) holds the merge lock and takes a long time to merge
- Another run (Run B) is waiting for the merge lock with a short timeout

### Setup Steps
1. Acquire merge lock for Run A (simulating an active long-running merge)
2. Start Run B's merge phase with a reduced timeout (e.g., 5 seconds instead of 5 minutes)
3. Run A does NOT release the lock within the timeout period

### Test Steps
1. Run B calls `waitForMergeLock(dfDir, 'run_B', 5000)` (5 second timeout)
2. Wait for the timeout to expire
3. Observe Run B's behavior after timeout

### Expected Outputs
- `waitForMergeLock` throws/rejects with an error containing 'timeout' or 'merge lock timeout'
- Run B does NOT hang indefinitely
- Run B is marked as failed with error message indicating merge lock timeout
- Run A's lock is NOT disturbed (still held by A)
- Console/log output includes: something like '[dark] Merge lock timeout after 5000ms'

### Pass/Fail Criteria
- PASS: Run B fails with clear timeout error message within ~5 seconds, does not hang, does not corrupt Run A's lock
- FAIL: Run B hangs indefinitely, OR crashes without clear error, OR steals Run A's lock, OR corrupts lock state