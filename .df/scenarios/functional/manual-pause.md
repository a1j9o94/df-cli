---
name: manual-pause
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: A running build with active agents. STEPS: 1. Start 'dark build <spec-id> --budget-usd 100' (high budget so no auto-pause). 2. While running, execute 'dark pause <run-id>'. EXPECTED: (a) Run transitions to 'paused' status. (b) pause_reason = 'manual' (not 'budget_exceeded'). (c) paused_at is set. (d) Active agents receive SIGTSTP (suspend). (e) Worktrees preserved. (f) Agent state recorded (current phase, module, last step). (g) Console output: 'Run <id> paused manually. Resume with: dark continue <id>'. (h) 'run-paused' event emitted with reason='manual'. ALSO TEST: 'dark pause' with no run-id should pause the most recent active run. PASS CRITERIA: Same pause behavior as auto-pause, but with manual reason.