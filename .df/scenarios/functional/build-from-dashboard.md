---
name: build-from-dashboard
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Start a build from the dashboard UI
PRECONDITIONS: A spec exists with status 'draft'. No active builds running for this spec.
STEPS:
1. Open dashboard
2. Click on the draft spec in the sidebar
3. Verify a 'Build' button is visible in the spec view
4. Click the 'Build' button
5. Observe the dashboard behavior after clicking
EXPECTED RESULTS:
- POST /api/builds is called with the spec ID in the request body
- Server-side: a new run is created in the runs table linked to this spec
- Server-side: the pipeline starts (equivalent to 'dark build <spec-id>')
- The POST /api/builds response includes the new run ID
- The dashboard transitions to the run view for the newly started build
- The spec status changes to 'building' in the sidebar
- The Build button becomes disabled while the run is active
PASS CRITERIA: Run created in database; pipeline initiated; dashboard shows run view; build button disabled
ERROR CASE: If build fails to start (e.g., spec not found, spec already building), an error message is shown inline in the dashboard (not a silent failure)