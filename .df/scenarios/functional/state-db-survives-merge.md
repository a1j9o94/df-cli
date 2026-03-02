---
name: state-db-survives-merge
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: State DB survives merge

### Preconditions
- A Dark Factory project is initialized with `.df/state.db` containing run history
- At least 1 run and 1 agent record exist in the DB
- A worktree branch exists with committed code changes (simulating a builder's work)

### Steps
1. Query `.df/state.db` and record the run count: `SELECT COUNT(*) FROM runs`
2. Record the agent count: `SELECT COUNT(*) FROM agents`
3. Verify a `.df/state.db.backup` is created before the merge phase starts
4. Execute the merge phase (rebaseAndMerge or equivalent) to merge the worktree branch
5. After merge completes, query `.df/state.db` again for run count and agent count
6. Verify backup file is cleaned up on successful merge

### Expected Output
- Step 3: `.df/state.db.backup` file exists before merge
- Step 5: Run count matches the count from Step 1
- Step 5: Agent count matches the count from Step 2
- Step 6: `.df/state.db.backup` is deleted after successful merge

### Pass Criteria
- The state DB has identical run and agent counts before and after merge
- The DB is readable and not corrupted after merge (can execute queries)
- Backup is created before and deleted after successful merge