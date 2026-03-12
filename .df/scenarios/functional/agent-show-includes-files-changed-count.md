---
name: agent-show-includes-files-changed-count
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFKPJ8HEY7A266WA4QRV46A
---

SCENARIO: formatAgentDetail must include a 'Files:' line showing files changed count from worktree.

SETUP:
1. Create test DB, run, builder agent with worktree_path set
2. Call getAgentDetail(db, agentId)

VERIFICATION:
- The agent show command (src/commands/agent/show.ts) must call getWorktreeFilesChanged(agent.worktree_path) before calling formatAgentDetail
- formatAgentDetail must accept a filesChanged parameter (like formatAgentListEntry does)
- Output must contain a line matching /Files:\s+\d+ files?/ between the 'Tokens:' and 'Created:' lines

PASS CRITERIA:
- formatAgentDetail output contains 'Files:' field with count from getWorktreeFilesChanged
- agent/show.ts imports and calls getWorktreeFilesChanged
- For agents without worktree, shows 'Files: 0 files' or 'Files: -'

FAIL CRITERIA:
- No 'Files:' line in formatAgentDetail output
- getWorktreeFilesChanged not called in agent/show.ts
- Files count always 0 regardless of worktree state