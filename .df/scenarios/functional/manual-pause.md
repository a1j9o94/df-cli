---
name: manual-pause
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Manual pause

### Preconditions
- A build is actively running with agents in progress

### Steps
1. Run: dark pause <run-id>
2. Alternatively: dark pause (no run-id, should pause most recent active run)

### Expected Results
- The run transitions to 'paused' state, same as auto-pause
- pause_reason = 'manual' (not 'budget_exceeded')
- Agent processes are suspended (SIGTSTP, fallback SIGSTOP)
- Agent state is preserved (worktrees, module assignments, phase)
- Console output: '[dark] Run <id> paused manually. Resume with: dark continue <id>'
- A 'run-paused' event is created with reason='manual'
- The run can be resumed with dark continue, same as budget-paused runs

### Pass Criteria
- SELECT status, pause_reason FROM runs WHERE id = <run-id> returns 'paused', 'manual'
- Event: run-paused event with reason='manual'
- Agent worktrees still exist
- dark continue <run-id> --budget-usd <amount> successfully resumes the run
- When no run-id specified, pauses the most recent active (running) run