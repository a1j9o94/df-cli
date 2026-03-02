---
name: agent-list-worktree-path
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: Agent list shows worktree path for builder agents.

SETUP:
1. Initialize in-memory DB with schema
2. Create a run record
3. Create a builder agent with worktree_path='/var/folders/.../foo-mm8abc', status=running

EXECUTE:
Run 'dark agent list' or invoke the list formatter

EXPECTED OUTPUT:
- The worktree path MUST appear in the output for each builder agent that has one
- The path should appear on a sub-line (indented) beneath the main agent summary line, prefixed with 'worktree:' or similar label
- Format example:
  agt_01XYZ  builder-foo (builder)  running  12m 34s  ~$0.62  3 files  module=foo
    worktree: /var/folders/.../foo-mm8abc

PASS CRITERIA:
- Output contains the literal worktree path string '/var/folders/.../foo-mm8abc'
- The worktree path appears labeled (e.g., 'worktree:')
- Agents without worktree_path do NOT show a worktree line