---
name: pause-all-running-builds
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start 3 separate build runs (run1, run2, run3) so all are in status 'running' with active agents. ACTIONS: (1) Run dark pause with NO arguments. EXPECTED: All 3 runs transition to status 'paused'. All running agents across all 3 runs get status 'paused'. dark status shows all as paused. PASS CRITERIA: (a) All 3 run records have status === 'paused'. (b) All agents that were 'running' are now 'paused'. (c) Agents that were already 'completed' or 'failed' are unchanged. (d) Output message lists all 3 run IDs and total agent count. (e) run-paused events created for each run.