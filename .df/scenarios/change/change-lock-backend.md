---
name: change-lock-backend
type: change
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Changeability: Switch from File-Based to DB-Based Locking

### Modification Description
Replace the file-based merge lock (`.df/merge.lock`) with a database-backed lock using the existing SQLite `resources` table pattern. The lock semantics must remain identical.

### Changes Required
Only `src/pipeline/merge-lock.ts` should need modification:
- `acquireMergeLock()`: Instead of creating a file, INSERT/UPDATE a row in a `merge_locks` table (or use existing `resources` table)
- `releaseMergeLock()`: Instead of deleting a file, UPDATE the row to release
- `waitForMergeLock()`: Instead of checking file existence, query the DB row
- Stale lock detection: Instead of checking PID from file, check PID from DB row

### Affected Areas
- ONLY `src/pipeline/merge-lock.ts` — the lock implementation module
- NOT `src/pipeline/engine.ts` — engine calls lock functions by interface, not implementation
- NOT merger agent prompts — merger doesn't interact with lock directly
- NOT `src/commands/status.ts` — reads queue from lock abstraction, not file directly
- NOT `src/dashboard/server.ts` — queries lock state through the same abstraction

### Expected Effort
- Low: 1 file change, ~50-80 lines modified
- Interface (function signatures) stays the same: `acquireMergeLock(dfDir, runId)`, `releaseMergeLock(dfDir, runId)`, `waitForMergeLock(dfDir, runId, timeoutMs)`
- All callers remain unchanged because they depend on the function contract, not the storage mechanism

### Pass/Fail Criteria
- PASS: Changing lock backend requires modifying ONLY merge-lock.ts (or its equivalent). Engine, status, dashboard, and merger code are untouched.
- FAIL: Changing lock backend requires modifying engine.ts, status.ts, dashboard/server.ts, or merger prompt — indicating tight coupling to file-based implementation