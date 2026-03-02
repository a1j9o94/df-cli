---
name: sequential-merge-two-builds
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Sequential Merge: Two Builds Complete Simultaneously

### Preconditions
- A git repository with a main branch containing at least one file (e.g., engine.ts)
- Two completed build runs (Run A and Run B) each with worktree branches that modify different parts of engine.ts
- Both runs reach the merge phase at approximately the same time

### Setup Steps
1. Initialize a test repo with a main branch and a file `engine.ts` containing known content
2. Create worktree branch A that adds a function `featureA()` to engine.ts
3. Create worktree branch B that adds a function `featureB()` to engine.ts (different location)
4. Simulate both runs reaching merge phase simultaneously

### Test Steps
1. Trigger merge for Run A and Run B concurrently
2. Observe that only ONE merge lock is acquired at a time
3. Verify Run A acquires lock first (or B — order doesn't matter, but must be sequential)
4. Verify the second run waits (polls) until the first completes
5. After first merge completes and releases lock, second run acquires lock
6. Second run rebases onto updated main before merging

### Expected Outputs
- `.df/merge.lock` file exists during each merge, contains JSON with `{ runId, acquiredAt, pid }`
- Lock file is removed after each merge completes
- Both runs eventually merge successfully
- Final main branch contains BOTH `featureA()` AND `featureB()`
- No concurrent merge operations (verified by checking lock acquisition/release timestamps)

### Pass/Fail Criteria
- PASS: Merges happen sequentially (lock held by only one run at a time), both changes present in final main
- FAIL: Both merges run simultaneously, OR second merge fails with conflicts, OR lock file not created