---
name: incomplete-agent-retried
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Incomplete agent retried via dark continue

### Preconditions
- A previous run attempt exists where a builder was marked `incomplete` (had commits but exited without complete)
- The run status is `failed` (build phase aborted due to incomplete builder)
- The incomplete builder's worktree exists with 2+ commits on a `df-staging/` branch
- The worktree path is recorded in the agent's DB record

### Steps
1. User runs `dark continue` (or `dark continue <run-id>`)
2. The engine resumes from the build phase
3. `getCompletedModules()` returns previously completed modules (if any)
4. For the incomplete module, the resume logic finds the preserved worktree via getFailedBuilderWorktree() — which now also checks for `incomplete` status agents
5. A new builder agent is spawned, reusing the existing worktree
6. The new builder receives mail instructions listing the previous commits
7. The new builder continues work, adds more commits
8. The new builder calls `dark agent complete <new-agent-id>`
9. Guards pass, branch is promoted from `df-staging/` to `df-ready/`
10. Build phase completes, merge phase runs and picks up the df-ready/ branch

### Expected Outputs
- New agent created for the same module
- New agent's worktree_path = same as the old incomplete agent's worktree
- Mail to new agent includes previous commits info
- After new agent calls complete: branch_name starts with `df-ready/`
- Merge phase successfully merges the branch
- Run status ends as `completed`

### Verification
- Query incomplete agent: `SELECT status FROM agents WHERE id = '<old-agent-id>'` → `incomplete`
- Query new agent: `SELECT status, branch_name FROM agents WHERE id = '<new-agent-id>'` → `completed`, `df-ready/...`
- The df-ready/ branch contains ALL commits (from both old and new builder)
- Events include `agent-branch-promoted` for the new agent

### Pass/Fail Criteria
- PASS: Worktree reused, previous commits visible, branch promoted, merge succeeds
- FAIL: New worktree created from scratch (losing commits), or branch not promoted, or merge ignores it