---
name: state-db-survives-merge
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## State DB Survives Merge

### Preconditions
- A Dark Factory project is initialized with state.db containing run history
- Record the current run count: SELECT COUNT(*) FROM runs
- A build pipeline has completed the build phase with at least one worktree branch ready to merge

### Steps
1. Record the run count in .df/state.db BEFORE the merge phase: SELECT COUNT(*) FROM runs (call this N)
2. Execute the merge phase (either via dark build or by manually triggering executeMergePhase)
3. After merge completes, query .df/state.db again: SELECT COUNT(*) FROM runs (call this M)
4. Verify M >= N (run count should be same or higher, never lower)
5. Also verify the specific run IDs that existed before the merge still exist after

### Expected Results
- The run count after merge is >= the run count before merge
- All run IDs that existed before merge still exist in the DB after merge
- The .df/state.db file was not overwritten or corrupted by the merge
- The .df/state.db-shm and .df/state.db-wal files were not replaced by stale worktree copies

### Pass/Fail Criteria
- PASS: All pre-merge run records are intact after the merge
- FAIL: Any run records are lost, or the DB becomes unreadable after merge