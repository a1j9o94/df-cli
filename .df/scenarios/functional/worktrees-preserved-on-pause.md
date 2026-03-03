---
name: worktrees-preserved-on-pause
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Worktrees preserved on pause

### Preconditions
- A build is running with active builder agents that have worktrees

### Steps
1. Trigger a budget pause (cost exceeds budget limit)
2. Check the filesystem for builder worktrees

### Expected Results
- Builder worktrees still exist on disk after pause
- Worktrees contain uncommitted or committed code from in-progress modules
- The worktree paths stored in agents.worktree_path match actual filesystem paths
- No cleanup has been performed on worktrees

### Pass Criteria
- For each agent with worktree_path in DB: the directory exists on disk
- Agent records in DB still have status, worktree_path, module_id, branch_name preserved
- No 'agent-killed' or 'agent-failed' events for the pause (agents are suspended, not killed)
- The pause_state JSON blob in the run record contains agent positions including worktree paths