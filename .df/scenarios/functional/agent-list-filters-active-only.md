---
name: agent-list-filters-active-only
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: A run exists with multiple agents - some running (live PIDs), some completed, some failed/killed from previous attempts on same modules.

STEPS:
1. Run: dark agent list --run-id <run-id> --active
2. Inspect output

PASS CRITERIA:
- Only agents with currently live PIDs are shown (process.kill(pid, 0) succeeds or equivalent check)
- Completed agents are NOT shown
- Failed/killed agents from previous attempts are NOT shown
- The --active flag is accepted without error
- If no agents have live PIDs, output says 'No active agents found.' or similar