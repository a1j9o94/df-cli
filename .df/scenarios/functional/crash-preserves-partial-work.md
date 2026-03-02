---
name: crash-preserves-partial-work
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Crash preserves partial work

### Preconditions
- A builder agent is spawned for a module requiring multiple implementation steps
- The builder has auto-commit enabled (per Fix 2)
- The builder has made 2 successful commits in the worktree

### Test Steps
1. Simulate a builder that makes 2 commits (2 TDD cycles complete), then crashes (process exits without calling dark agent complete)
2. After the crash, inspect the worktree directory
3. Verify the 2 commits are still present in the worktree's git log
4. Resume the build (dark continue)
5. Verify the new builder sees the previous commits and continues from where the last builder left off

### Expected Results
- The worktree directory still exists after the crash
- The 2 commits from the previous builder are present in git log
- The worktree is NOT cleaned up on builder failure (unlike current behavior which calls removeWorktree on failure)
- On resume, the new builder's instructions reference the previous commits
- The new builder does not redo already-committed work

### Pass/Fail Criteria
- PASS: Worktree with 2 commits survives crash; resumed builder continues from commit 2
- FAIL: Worktree is deleted on crash, or resumed builder starts from scratch