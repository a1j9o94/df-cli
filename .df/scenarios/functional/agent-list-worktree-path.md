---
name: agent-list-worktree-path
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark agent list shows worktree path for each builder.

SETUP:
1. Create test DB, run, and builder agent with worktree_path: '/var/folders/.../foo-mm8abc'

VERIFICATION:
- Call formatAgentListEntry(agent) from src/utils/format-agent-list.ts
- Output MUST contain a second line with 'worktree: /var/folders/.../foo-mm8abc'
- The worktree line must be indented (starts with spaces)

NEGATIVE TEST:
- Create agent with worktree_path: null
- formatAgentListEntry output must NOT contain 'worktree:' line

PASS CRITERIA:
- Worktree path is shown on a sub-line when present
- Worktree line is omitted when worktree_path is null