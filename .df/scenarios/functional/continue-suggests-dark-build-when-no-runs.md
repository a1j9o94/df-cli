---
name: continue-suggests-dark-build-when-no-runs
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNBP8YDWBE5G0KK4H7V01R0
---

SCENARIO: dark continue with no resumable runs should suggest 'dark build' in its error message.

PRECONDITIONS:
- No failed or stale running runs in DB (all completed or cancelled, or empty)

STEPS:
1. Run: dark continue
2. Observe the error message

EXPECTED OUTPUTS:
- Exit code is non-zero (1)
- Error message mentions no resumable runs
- Error message explicitly includes the text 'dark build' as a suggested alternative command

PASS CRITERIA:
- Output contains the string 'dark build'
- FAIL if error message only says 'No resumable runs found' without suggesting an alternative command
- This is a user experience requirement: when a command has no work to do, suggest the right next command