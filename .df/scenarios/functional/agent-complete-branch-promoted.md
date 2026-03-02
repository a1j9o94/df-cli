---
name: agent-complete-branch-promoted
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Agent calls complete, branch promoted

### Preconditions
- A run exists with an active buildplan containing at least 1 module
- A builder agent has been spawned with a worktree on branch `df-staging/<run-short>/<module-id>-<suffix>`
- The builder has committed at least one file change in its worktree

### Steps
1. Builder calls `dark agent complete <agent-id>`
2. The completion guard checks for file changes (should pass since there are commits)
3. After guards pass, the command runs `git branch -m df-staging/<run-short>/<module-id>-<suffix> df-ready/<run-short>/<module-id>-<suffix>` in the worktree
4. An `agent-branch-promoted` event is emitted with both old and new branch names
5. The agent's DB record is updated with the new branch_name (df-ready/...)
6. Agent status is set to `completed`

### Expected Outputs
- Agent status in DB: `completed`
- Agent branch_name in DB: starts with `df-ready/`
- Git branch in worktree: `df-ready/<run-short>/<module-id>-<suffix>` (old df-staging/ branch no longer exists)
- Event `agent-branch-promoted` exists with `{ oldBranch: 'df-staging/...', newBranch: 'df-ready/...' }`
- Event `agent-completed` also exists
- The merge phase can discover this branch when querying for df-ready/ branches

### Pass/Fail Criteria
- PASS: All expected outputs match, branch renamed atomically, events emitted
- FAIL: Branch still named df-staging/, or no promotion event, or agent status not completed