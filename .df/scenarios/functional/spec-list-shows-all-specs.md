---
name: spec-list-shows-all-specs
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Sidebar shows all specs grouped by status with correct badges.

PRECONDITIONS:
- Dark Factory project initialized
- Dashboard running

SETUP:
- Create 3 specs with different statuses:
  1. A draft spec (status: draft, no runs)
  2. A building spec (status: building, has an active run with status 'running')
  3. A completed spec (status: completed, has a completed run with all scenarios passed)
- This can be done via API: POST /api/specs for each, then manipulate DB for statuses

STEPS:
1. Open dashboard
2. Examine the sidebar (spec list area)

EXPECTED RESULTS:
- All 3 specs are visible in the sidebar
- Specs are grouped by status: building, draft, completed (in that order or similar logical grouping)
- Each spec card shows:
  a. Title (human-readable, NOT the spec ID)
  b. Status badge (visual indicator of draft/building/completed)
  c. Last modified date
- The completed spec shows its most recent run pass rate as a small indicator
- Clicking any spec shows its content in the main panel

ADDITIONAL CHECKS:
- GET /api/specs returns all 3 specs with correct status, title, and last_modified fields
- The sidebar updates when a spec status changes (e.g., from draft to building)
- The 'New Spec' button is visible in the sidebar header

PASS CRITERIA:
- All specs visible regardless of status
- Grouping by status is correct
- Badges match actual status
- Titles shown (not IDs)
- Last modified dates present
- Completed spec shows pass rate indicator