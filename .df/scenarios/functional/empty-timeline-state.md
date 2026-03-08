---
name: empty-timeline-state
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Fresh project with dark init completed but no specs created or runs executed. Database has no rows in runs or specs tables.

Steps:
1. Start the dashboard server
2. Navigate to the Timeline tab

Expected:
- Timeline tab renders without errors (no blank screen, no JS console errors)
- Summary stats bar shows: 0 completed, $0.00 cost, 0% or N/A pass rate, 0 in progress
- 'This Week' section shows empty state message (e.g. 'No specs completed yet')
- 'In Progress' section shows empty state
- 'Planned' section shows empty state
- No broken layout, no 'undefined' or 'null' text rendered

Pass criteria: Clean empty state with helpful messaging, no rendering errors.