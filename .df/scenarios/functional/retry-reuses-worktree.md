---
name: retry-reuses-worktree
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Retry reuses worktree with commits

### Preconditions
- A builder agent was spawned, made commits in its worktree, then failed
- The worktree exists at /tmp/df-worktrees/<moduleId>-<suffix> with commits from the previous attempt
- The run is in a resumable state (failed)

### Test Steps
1. Run a builder that makes 2 commits, then fails (agent status = failed)
2. Record the worktree path and its git log (commit hashes)
3. Run dark continue to retry the failed builder
4. Check what worktree path the new builder receives
5. Check the new builder's instruction mail

### Expected Results
- The new builder gets the SAME worktree path (not a fresh worktree)
- The existing commits from the previous attempt are still in the worktree's git log
- The new builder's instruction mail mentions: 'Previous attempt made these commits: [list of commit messages]'
- The new builder continues from where the old one left off
- No fresh worktree is created if the old one has commits

### Pass/Fail Criteria
- PASS: Same worktree reused, previous commits visible, new builder instructions reference previous work
- FAIL: Fresh worktree created (old one deleted), or new builder has no knowledge of previous progress