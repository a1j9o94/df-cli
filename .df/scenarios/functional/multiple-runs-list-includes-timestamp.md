---
name: multiple-runs-list-includes-timestamp
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNBP8YDWBE5G0KK4H7V01R0
---

SCENARIO: When multiple resumable runs are listed, each entry includes a timestamp.

PRECONDITIONS:
- Two or more failed runs exist in DB

STEPS:
1. Run: dark continue (no args)
2. Observe the printed run list

EXPECTED OUTPUTS:
- Each listed run includes: ID, failed phase, and creation timestamp
- Timestamps help users identify which run to resume (e.g., most recent)

PASS CRITERIA:
- Each run entry in the output includes a timestamp or date string
- FAIL if runs are listed with only ID and phase but no time information
- Users need timestamps to distinguish runs that failed at the same phase