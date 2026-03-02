---
name: merger-fails-on-conflict-markers
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Merger Fails on Conflict Markers

### Preconditions
- A Dark Factory project is initialized
- A run exists with a merger agent in running state
- The merger has created at least one commit on the target branch

### Steps
1. Create a tracked file containing git conflict markers: <<<<<<< HEAD, =======, >>>>>>> branch-name
2. Stage and commit this file (simulating a bad merge resolution)
3. Run: dark agent complete <merger-agent-id>

### Expected Results
- The complete command exits with a non-zero exit code
- The error message mentions conflict markers were found
- The error message identifies which file(s) contain conflict markers
- The agent status remains 'running' (not changed to 'completed')

### Pass/Fail Criteria
- PASS: dark agent complete rejects when any tracked file contains <<<<<<< or ======= or >>>>>>> markers
- FAIL: dark agent complete succeeds despite conflict markers in tracked files