---
name: agent-list-worktree-path
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: Agent list shows worktree path for each builder agent.

SETUP:
1. Initialize dark factory project
2. Start a build with at least 2 builder agents running in parallel
3. Ensure builders have worktree_path set in the database

TEST STEPS:
1. Run 'dark agent list'
2. For each builder agent, check for worktree path line

EXPECTED OUTPUT:
Each builder agent entry should include a second line with worktree path:
  agt_XXXXX  builder-foo (builder)  running  12m 34s  ~$0.62  3 files  module=foo
    worktree: /var/folders/.../foo-mm8abc

PASS CRITERIA:
- Every agent with role=builder shows a 'worktree:' line beneath its main info line
- The worktree path is an absolute filesystem path
- The path matches the worktree_path stored in the agents table (verify via --json output)
- Non-builder agents (orchestrator, architect) that lack worktree_path do NOT show a worktree line (no empty 'worktree: ' output)

FAIL CRITERIA:
- Builder agents missing worktree path in output
- Worktree path shown as 'null' or empty string
- Need to query sqlite to find worktree path