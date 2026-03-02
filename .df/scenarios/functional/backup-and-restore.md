---
name: backup-and-restore
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Backup and Restore

### Preconditions
- A Dark Factory project is initialized with .df/state.db containing real data (at least 1 run, 2 agents)
- The merge phase has started (which should trigger automatic backup creation)

### Steps
1. Verify .df/state.db.backup was created before the merge phase begins
2. Record the run count from .df/state.db.backup (to verify it is a valid copy)
3. Deliberately corrupt .df/state.db (e.g., write random bytes to it, or truncate it to 0 bytes)
4. Run: dark status
5. Observe output

### Expected Results
- Step 1: .df/state.db.backup exists and was created at the start of the merge phase
- Step 2: The backup contains valid SQLite data with the same run count as original
- Step 4: dark status detects that .df/state.db is corrupt or unreadable
- Step 5: dark status offers to restore from .df/state.db.backup (either automatically or by prompting)
- After restore: .df/state.db contains all the original data (same run count, same agent records)

### Additional Verification
- On SUCCESSFUL merge completion, .df/state.db.backup should be DELETED (cleanup)
- On FAILED merge, .df/state.db.backup should be PRESERVED for manual recovery

### Pass/Fail Criteria
- PASS: Backup is created before merge, dark status detects corruption, restore recovers all data
- FAIL: No backup created, OR dark status does not detect corruption, OR restore fails or loses data