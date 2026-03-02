---
name: backup-and-restore
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: Backup and restore

### Preconditions
- A Dark Factory project is initialized with `.df/state.db` containing valid data
- A backup file exists at `.df/state.db.backup` (e.g., created by the merge phase)

### Steps
1. Copy `.df/state.db` to `.df/state.db.backup` (simulating pre-merge backup)
2. Record the run count from the backup: query the backup DB for `SELECT COUNT(*) FROM runs`
3. Corrupt `.df/state.db` by writing random bytes to it (or truncating it to 0 bytes)
4. Run `dark status`
5. Observe the output — it should detect DB corruption
6. Verify the output offers to restore from `.df/state.db.backup`
7. (If restore is automatic or prompted) Verify DB is restored and queryable
8. After restore, verify run count matches Step 2

### Expected Output
- Step 4-5: `dark status` detects corruption (doesn't crash, shows a meaningful message)
- Step 6: Output mentions `.df/state.db.backup` and offers restoration
- Step 7-8: After restore, DB is functional and contains the same data as the backup

### Pass Criteria
- `dark status` gracefully handles a corrupt/missing DB (no unhandled crash)
- When a backup exists, the user is informed and offered restoration
- Restoration produces a working DB with preserved data