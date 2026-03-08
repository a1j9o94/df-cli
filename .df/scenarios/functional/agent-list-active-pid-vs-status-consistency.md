---
name: agent-list-active-pid-vs-status-consistency
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6T260P6J76XFHYA5TD7C95
---

SCENARIO: --active flag must use PID checking, not just status filtering.

PRECONDITION: A run with an agent in 'running' status but whose PID has died (process no longer exists).

STEPS:
1. Create agent with status='running' and pid=99999 (non-existent PID).
2. Run: dark agent list --active

EXPECTED OUTPUT:
- The agent with dead PID should NOT appear.
- Only agents whose PIDs are actually alive (process.kill(pid, 0) succeeds) should appear.

PASS CRITERIA:
- --active filter uses isProcessAlive() or equivalent PID check.
- Status-only filtering is insufficient — a 'running' agent with a dead PID must be excluded.
- This prevents showing stale agents from crashed processes.

FAIL CRITERIA:
- --active only filters by status IN (pending, spawning, running) without PID checking.
- Agent with dead PID appears in --active output.