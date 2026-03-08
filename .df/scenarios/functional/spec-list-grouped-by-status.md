---
name: spec-list-grouped-by-status
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Spec list sidebar shows all specs grouped by status
PRECONDITIONS: Three specs exist: one with status 'draft', one with status 'building' (active run), one with status 'completed' (has a completed run with passed scenarios).
STEPS:
1. Open dashboard
2. Observe the sidebar content
EXPECTED RESULTS:
- The sidebar shows a spec-centric view (not run-centric)
- Specs are grouped into sections by status: building, draft, completed
- Each spec card shows: title, status badge (colored), last modified date
- The 'building' spec appears under the 'building' group with appropriate badge
- The 'draft' spec appears under the 'draft' group
- The 'completed' spec appears under the 'completed' group
- The completed spec shows its most recent run's pass rate as a small indicator (e.g., '6/6 passed')
- A 'New Spec' button is visible in the sidebar header
- Clicking a spec card selects it and shows its content in the main panel
PASS CRITERIA: All 3 specs visible; correct grouping; correct badges; pass rate shown on completed spec; New Spec button present
API VERIFICATION: GET /api/specs returns all specs with status, title, last_modified fields