---
name: agent-exits-without-complete
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Agent exits without calling complete

### Preconditions
- A run exists with an active buildplan
- A builder agent has been spawned with a worktree on branch `df-staging/<run-short>/<module-id>-<suffix>`
- The builder has made 2-3 commits of real code in its worktree
- The builder process exits (PID dies) WITHOUT calling `dark agent complete`

### Steps
1. The engine's waitForAgent() or build-phase polling loop detects PID is dead
2. It checks DB status — agent has NOT called complete, status is still `running`
3. It checks the worktree for commits using `git log --oneline HEAD~1..HEAD` or worktreeHasCommits()
4. Commits exist, so agent status is set to `incomplete` (NOT `failed`)
5. The worktree is preserved (NOT removed)
6. The staging branch remains as `df-staging/...` (NOT promoted to df-ready/)

### Expected Outputs
- Agent status in DB: `incomplete`
- Agent error in DB: contains message about process exiting without completing
- Agent branch_name in DB: starts with `df-staging/` (unchanged)
- Worktree directory still exists with the commits
- No `agent-branch-promoted` event exists
- The merge phase will NOT pick up this branch (it only looks for df-ready/)

### Verification
- Query: `SELECT status, branch_name FROM agents WHERE id = '<agent-id>'`
  - status = 'incomplete'
  - branch_name LIKE 'df-staging/%'
- Worktree path exists on disk
- `git log --oneline` in worktree shows the 2-3 commits

### Pass/Fail Criteria
- PASS: Status is `incomplete`, worktree preserved, staging branch intact, merge phase ignores it
- FAIL: Status is `failed` instead of `incomplete`, or worktree removed, or branch promoted