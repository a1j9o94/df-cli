---
name: auto-select-single-failed-run
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Auto-select when exactly one failed run exists

PRECONDITIONS:
- Exactly one run in the DB with status='failed' (e.g., run_abc123)
- Zero or more runs with status='completed' (these should be ignored)
- The failed run has current_phase='build'

STEPS:
1. Run: dark continue (NO run-id argument)
2. Command queries DB: SELECT * FROM runs WHERE status IN ('failed') — also check 'running' with no active agents
3. Exactly one result returned
4. Command auto-selects run_abc123 without prompting user
5. Prints message like: 'Resuming run run_abc123 (failed at build phase)'
6. Passes run_abc123 to engine.resume()
7. Engine resumes from the appropriate phase

EXPECTED OUTPUTS:
- No interactive prompt / user selection needed
- Console output indicates which run was auto-selected
- Resume proceeds normally
- run.status transitions to 'running' then 'completed'

PASS CRITERIA:
- Command exits 0 (success)
- No user interaction required
- The auto-selected run matches the only failed run
- run.status === 'completed' at end
- Console output contains the run ID and failed phase info