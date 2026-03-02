---
name: crash-preserves-partial-work
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Crash preserves partial work in worktree

### Preconditions
- A builder agent is running in an isolated worktree (e.g., /tmp/df-worktrees/module-xyz)
- The builder has made 2 git commits in the worktree before crashing
- The builder process exits without calling 'dark agent complete'

### Test Steps
1. Set up a builder in a worktree
2. Simulate the builder making 2 commits (e.g., 'feat: implement function A' and 'feat: implement function B')
3. Simulate a crash (process exit without completing)
4. Check that the engine's failure handler does NOT call removeWorktree() when commits exist
5. Verify the worktree still exists on disk
6. Check git log in the worktree shows the 2 commits
7. Resume the build using dark continue
8. Verify the new builder's mail includes reference to the previous commits

### Expected Output
- After crash, worktree directory still exists at the original path
- git log in the worktree shows the 2 commits from the previous attempt
- On resume, the new builder receives instructions mentioning the previous commits
- The new builder continues from where the previous one left off (doesn't re-implement already-committed code)

### Pass/Fail Criteria
- PASS: Worktree survives crash, commits are intact, resume builder gets previous commit info
- FAIL: Worktree is cleaned up on crash (removeWorktree called), OR resume creates a fresh worktree ignoring previous commits