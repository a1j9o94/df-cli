---
name: agent-list-worktree-path
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: Agent list shows worktree path for builder agents.

PRECONDITIONS:
- A run exists with at least one builder agent that has worktree_path set in the DB.
- The worktree_path value is a valid filesystem path.

STEPS:
1. Run: dark agent list --run-id <run_id>
2. Capture text output.

EXPECTED OUTPUT:
- For each agent with a worktree_path, there is an indented line below the main agent line showing: 'worktree: <path>'
- The indentation is deeper than the main line (at least 4 spaces).
- The path matches the worktree_path value from the agents DB table.

PASS CRITERIA:
- Output contains a line matching /^\s{4,}worktree:\s+\S+/ for each agent that has a worktree.
- The worktree path shown matches what is stored in state.db agents.worktree_path.
- Agents without worktree_path do NOT show a worktree line.