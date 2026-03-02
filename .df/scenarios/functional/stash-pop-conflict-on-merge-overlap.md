---
name: stash-pop-conflict-on-merge-overlap
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJRA7TBXR385HPD7TGX2BV3E
---

SCENARIO: Main repo has uncommitted changes to a file that also gets modified by a builder merge. Stash pop will conflict.

SETUP:
1. Create a git repo with initial commit including src/shared.ts
2. Create a worktree, modify src/shared.ts there, commit
3. On main, modify src/shared.ts differently WITHOUT committing

EXECUTION:
4. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED:
- sanitizeMainRepo stashes the main changes
- Merge brings in worktree changes to src/shared.ts
- unstashMainRepo tries git stash pop, which conflicts
- unstashMainRepo returns false (catch block)
- The stash is NOT popped — user loses their uncommitted changes silently

PASS CRITERIA:
- Verify that when stash pop fails, the stash is preserved (not lost)
- Verify that the failure is logged/reported rather than silently swallowed
- Currently unstashMainRepo returns false on error but the caller doesn't check the return value