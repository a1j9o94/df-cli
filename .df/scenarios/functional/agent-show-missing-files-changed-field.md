---
name: agent-show-missing-files-changed-field
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6T260P6J76XFHYA5TD7C95
---

SCENARIO: dark agent show <id> must display the files changed count.

PRECONDITION: An agent exists with a valid worktree_path that has modified files.

STEPS:
1. Run: dark agent show <agent-id>
2. Inspect output for 'Files:' line.

EXPECTED OUTPUT:
- A line 'Files:      3 files' (or similar) showing the number of files changed in the agent's worktree.
- Uses getWorktreeFilesChanged(worktree_path) to compute the count.
- The field appears between 'Tokens:' and 'Created:' lines.

PASS CRITERIA:
- Output contains a line matching /Files:\s+\d+ files?/ for agents with a worktree.
- For agents without a worktree, 'Files: 0 files' or 'Files: -' is shown.
- The files count matches what git reports for the worktree.

FAIL CRITERIA:
- No 'Files:' field in agent show output.
- Files count is hardcoded or always 0 regardless of worktree state.