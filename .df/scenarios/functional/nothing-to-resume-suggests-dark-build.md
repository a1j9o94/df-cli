---
name: nothing-to-resume-suggests-dark-build
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: When no resumable runs exist, dark continue suggests using dark build

PRECONDITIONS:
- No failed or stale runs in DB (all completed or cancelled)

STEPS:
1. Run: dark continue
2. Command should exit with non-zero code
3. Output should mention there are no runs to resume
4. Output should suggest using 'dark build' as an alternative

EXPECTED OUTPUTS:
- Exit code is non-zero
- Output contains text about no resumable runs
- Output contains 'dark build' as suggested next step

PASS CRITERIA:
- Exit code is non-zero
- Output explicitly mentions 'dark build' or 'Use dark build' as an alternative
- FAIL if output only says 'no runs' without suggesting an alternative command
