---
name: auto-pause-on-budget
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: Create a run with --budget-usd 2 for a spec that costs more than $2 to build. STEPS: 1. Run 'dark build <spec-id> --budget-usd 2'. 2. Wait for cost to reach ~$2. EXPECTED: (a) Run status in DB transitions to 'paused' (NOT 'failed'). (b) runs.pause_reason = 'budget_exceeded'. (c) runs.paused_at is set to a timestamp. (d) Console output contains 'Run paused: budget $2.00 reached'. (e) Console output contains 'Resume with: dark continue <run-id> --budget-usd'. (f) A 'run-paused' event exists in events table with run_id, cost, and reason. (g) Agent processes are suspended (SIGTSTP/SIGSTOP sent), NOT killed. (h) Agent records in DB still exist with status NOT set to 'failed'. PASS CRITERIA: Run is in 'paused' state, not 'failed'. All agent state preserved.