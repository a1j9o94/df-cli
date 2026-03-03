---
name: loading-spinner-not-shown-when-no-run-selected
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJS1H35CGTM3ZRT2YN5H2FZN
---

SCENARIO: Loading spinners should not appear in detail panels when no run is selected.

PRECONDITIONS:
- Dashboard server running
- No run selected (initial state)

STEPS:
1. Open dashboard
2. Observe the detail panels area

EXPECTED:
- The empty-state message ('Select a run to view details') is shown
- No loading spinners are visible in agents-container, modules-container, or run-header
- The detail-panels div has display:none

VERIFICATION:
- The initial HTML has empty-state visible and detail-panels hidden
- No loading-spinner elements are rendered until a run is selected