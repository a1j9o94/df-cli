---
name: pause-resume-no-corruption
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Pause does not corrupt state

### Preconditions
- A multi-module build is in progress

### Steps
1. Start a build with moderate budget
2. Let some modules complete
3. Trigger a pause (budget or manual)
4. Resume with more budget: dark continue <run-id> --budget-usd <higher>
5. Let the build complete

### Expected Results
- After resume, the pipeline picks up from where it left off
- Already-completed modules are not re-run
- In-progress modules resume or restart correctly
- The full build completes successfully
- All functional scenarios pass on the final output
- No data corruption: run cost_usd is cumulative (pre-pause + post-resume)
- No duplicate agents for already-completed modules
- The pause/resume cycle does not introduce missed modules

### Pass Criteria
- Run completes with status='completed'
- Number of completed builder agents equals number of modules
- No duplicate module_id among completed builders
- Run cost_usd reflects total across both pre-pause and post-pause execution
- Events timeline shows: run-started -> ... -> run-paused -> run-resumed -> ... -> run-completed