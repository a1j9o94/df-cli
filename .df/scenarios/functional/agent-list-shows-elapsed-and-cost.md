---
name: agent-list-shows-elapsed-and-cost
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: A run exists with at least one agent in 'running' status that was created_at > 60 seconds ago and has cost_usd > 0.

STEPS:
1. Run: dark agent list --run-id <run-id>
2. Inspect output for the running agent line

EXPECTED OUTPUT FORMAT (each running agent should show):
  agt_XXXXX  builder-name (builder)  running  Xm Xs  $X.XX  N files  module=mod-id
    worktree: /path/to/worktree
    last heartbeat: Xm ago

PASS CRITERIA:
- Elapsed time is shown in human-readable format (e.g. '12m 34s', not raw ms or ISO timestamp)
- Cost is shown with dollar sign (e.g. '$0.62')
- Files changed count is shown (e.g. '3 files')
- Worktree path is shown on indented second line
- Last heartbeat shown as relative time ('2m ago' or 'never')
- All 5 new fields present for running agents
- Completed/failed agents may omit some fields but should still show elapsed and cost