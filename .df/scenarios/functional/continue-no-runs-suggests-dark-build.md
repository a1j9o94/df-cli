---
name: continue-no-runs-suggests-dark-build
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNC56310SNWYZW3XKQ6DJX9
---

SCENARIO: dark continue with no resumable runs must suggest 'dark build' in error message

PRECONDITIONS:
- No failed or stale running runs in DB

STEPS:
1. Run: dark continue
2. Command exits with non-zero code
3. Inspect the error message text

EXPECTED:
- Error message includes the literal text 'dark build'
- Example: 'No failed or interrupted runs to resume. Use dark build to start a new run.'

PASS CRITERIA:
- Output contains the substring 'dark build'
- FAIL if message only says 'No resumable runs found' without suggesting next action
- The current code says: 'No resumable runs found. There are no failed or stale runs.' — this FAILS because it does not mention dark build
- This is a UX requirement: dead-end error messages must suggest the correct next command