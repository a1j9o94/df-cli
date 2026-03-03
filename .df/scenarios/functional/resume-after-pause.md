---
name: resume-after-pause
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Resume after budget pause

### Preconditions
- A run exists in 'paused' state with cost_usd ~$2.00 and budget_usd = 2.00
- Some modules were completed before the pause
- Agent worktrees and state are preserved

### Steps
1. Run: dark continue <run-id> --budget-usd 10
2. Wait for the pipeline to resume

### Expected Results
- Run status transitions from 'paused' to 'running'
- runs.paused_at is cleared (set to null)
- runs.budget_usd is updated to 10.00 (new total, not increment)
- A 'run-resumed' event is created
- Previously completed modules are NOT re-executed
- The pipeline resumes from where it left off (same phase, same progress)
- Suspended agent processes receive SIGCONT if still alive
- If agent processes are dead, they are restarted using stored pause state (same module, same phase, same worktree)

### Pass Criteria
- After resume: SELECT status FROM runs WHERE id = <run-id> returns 'running'
- After resume: SELECT budget_usd FROM runs WHERE id = <run-id> returns 10.00
- Completed modules from before pause are still completed, not re-run
- The resume does not restart from scratch — it continues from pause point
- Event query: SELECT type FROM events WHERE run_id = <run-id> ORDER BY created_at shows 'run-paused' followed by 'run-resumed'