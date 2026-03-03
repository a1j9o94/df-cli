---
name: build-from-dashboard
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Start a build from the dashboard UI.

PRECONDITIONS:
- Dark Factory project initialized
- Dashboard running
- A draft spec exists with valid content (goal, requirements, scenarios sections)
- No active build running for this spec

STEPS:
1. Open dashboard
2. Click on a draft spec in the sidebar to open it
3. Verify a 'Build' button is visible in the spec detail panel
4. Click the 'Build' button
5. Observe the dashboard response

EXPECTED RESULTS:
- POST /api/builds is called with the spec ID in the request body
- Server-side: a new run is created in the runs table with spec_id set
- Server-side: equivalent to running 'dark build <spec-id>' — pipeline starts
- The dashboard transitions to show the run view for the newly started build
- The API returns the new run ID in the response
- The run appears in the runs list / sidebar

VERIFICATION:
- Query DB: SELECT * FROM runs WHERE spec_id = '<spec-id>' ORDER BY created_at DESC LIMIT 1
- The run status should be 'pending' or 'running'
- The spec status may transition to 'building'
- GET /api/specs/:id/runs should list the new run

ERROR HANDLING:
6. If the build fails to start (e.g., spec not found, already building), verify:
   - Error message is shown inline in the dashboard (not silent failure)
   - The error is descriptive (not just 'Internal server error')

PASS CRITERIA:
- Build triggers successfully from UI
- Run created in database
- Dashboard shows the active run
- Error states handled with visible messages