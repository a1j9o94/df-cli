---
name: continue-error-does-not-mention-dark-build
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQP5BA25VFN8JV1EKCK0WK1
---

SCENARIO: When dark continue has no resumable runs, the error message says 'No resumable runs found. There are no failed or stale runs.' but does NOT suggest 'dark build' as the next action. A user who runs 'dark continue' for the first time with no prior runs gets no guidance on what to do next. STEPS: 1. Ensure no runs exist in state.db 2. Run dark continue 3. Check error output. PASS CRITERIA: Error output contains 'dark build' as suggested command. FAIL if error message lacks 'dark build' suggestion.