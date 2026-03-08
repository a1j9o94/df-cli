---
name: change-time-grouping
type: change
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Modification: Switch from calendar weeks (Mon-Sun) to rolling 7-day windows for the 'This Week' and 'Last Week' sections.

Change description: Instead of Mon-Sun calendar week boundaries, 'This Week' should show specs completed in the last 7 days from now, and 'Last Week' should show specs completed 8-14 days ago.

Affected areas:
- The date bucketing logic in the /api/timeline handler (server.ts) — change the SQL WHERE clauses or JS date calculations that determine thisWeek/lastWeek boundaries
- No UI component changes required (same sections, same rendering)
- No CLI digest formatting changes required (same section structure)
- No data model changes required

Expected effort: Small — localized to 1 function (the date bucketing/grouping logic in the API handler). Estimated ~10-20 lines of date math changes.

Verification: After change, a spec completed 6 days ago appears in 'This Week' regardless of whether it was in the current calendar week. A spec completed 10 days ago appears in 'Last Week'.