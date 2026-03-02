---
name: agent-complete-rejected-by-guard
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Agent complete rejected by guard — branch stays staging

### Preconditions
- A builder agent exists with a worktree on branch `df-staging/<run-short>/<module-id>-<suffix>`
- The builder has NOT made any file changes (no commits, no staged changes, no untracked files)

### Steps
1. Builder calls `dark agent complete <agent-id>`
2. The completion guard runs: checks for file changes in worktree
3. Guard fails: 'No files changed in worktree. You must write code before completing.'
4. The branch is NOT renamed — stays as `df-staging/...`
5. The agent status is NOT updated to `completed`
6. No `agent-branch-promoted` event is emitted
7. Process exits with non-zero exit code

### Expected Outputs
- Console output: error message about no files changed
- Agent status in DB: unchanged (still `running`)
- Agent branch_name in DB: still `df-staging/...` (or null if not yet stored)
- Git branch in worktree: still `df-staging/<run-short>/<module-id>-<suffix>`
- No `agent-branch-promoted` event
- No `agent-completed` event

### Pass/Fail Criteria
- PASS: Guard rejects completion, branch stays staging, clear error message shown
- FAIL: Branch promoted despite guard failure, or agent marked completed, or unclear error