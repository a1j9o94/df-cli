---
name: merge-conflict-no-abort-leaves-dirty-state
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRPR4XJ6ZFBG0V4A4PKQJ6M
---

When git merge --no-commit --no-ff fails in rebaseAndMerge (rebase-merge.ts line 176), the catch block on line 242-245 adds the branch to failedBranches but does NOT call git merge --abort. This leaves the main repo in a MERGING state with conflict markers in the working tree. Subsequent merge attempts for the next branch would fail because git is in a dirty state.

VERIFICATION:
1. Create two worktree branches that modify the same line in the same file
2. Rebase branch A succeeds, merge succeeds
3. Rebase branch B succeeds (no prior conflict at rebase time), but merge --no-commit conflicts
4. Verify git merge --abort is called after the failed merge
5. Verify the main repo is in a clean state after the failure
6. If a third branch exists, verify it can still attempt to merge

EXPECTED:
- After a failed merge, git merge --abort should be called
- The main repo should not have MERGE_HEAD present
- No conflict markers in working tree after abort

PASS CRITERIA:
- The rebaseAndMerge function aborts in-progress merges on failure
- git status shows clean working tree after handling the failure