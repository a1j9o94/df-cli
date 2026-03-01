---
name: multiple-failed-runs-selection
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Multiple failed runs — list them and require explicit selection

PRECONDITIONS:
- Two runs in DB with status='failed':
  - run_aaa: failed at phase='architect', created_at='2026-03-01T10:00:00Z'
  - run_bbb: failed at phase='build', created_at='2026-03-01T11:00:00Z'
- Each is associated with a different (or same) spec

STEPS:
1. Run: dark continue (NO run-id argument)
2. Command queries DB for resumable runs
3. Finds 2 results — does NOT auto-select
4. Prints a list:
   - run_aaa — failed at architect (2026-03-01 10:00)
   - run_bbb — failed at build (2026-03-01 11:00)
5. Exits with message indicating user must specify: 'Multiple failed runs found. Please specify: dark continue <run-id>'

THEN:
6. Run: dark continue run_bbb
7. Command finds run_bbb, validates it is resumable
8. Resumes run_bbb from build phase

EXPECTED OUTPUTS:
- Step 1-5: Command lists runs with phase info and timestamps, exits non-zero or with guidance
- Step 6-8: Specified run resumes correctly

PASS CRITERIA:
- Without args: lists both runs with identifying info (ID, failed phase, timestamp)
- Without args: does NOT start resuming either run
- With explicit run-id: resumes the correct run
- Listed runs include enough info to distinguish them (phase, time, optionally spec title)