---
name: overview-tab-shows-architecture
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: Overview tab shows architecture when buildplan exists.

PRECONDITIONS:
- Database has a completed run (run_test1) with an active buildplan
- Buildplan has 2 modules: 'HTTP API Server' and 'Dashboard UI' with dependency: UI depends on API
- Dashboard server is running

TEST STEPS:
1. Fetch GET / (HTML dashboard)
2. Verify the tab bar contains an 'Overview' tab (should be the default/first tab)
3. Verify the Overview tab panel exists and is the active/default panel
4. Inspect the Overview tab rendering JavaScript
5. Verify it fetches GET /api/runs/:id/buildplan to get module data
6. Verify the overview renders module names and one-line descriptions (e.g. 'HTTP API Server', 'Dashboard UI')
7. Verify a dependency flow visualization exists (e.g. showing mod-api-server -> mod-dashboard-ui)

EXPECTED RESULTS:
- Tab bar has 'Overview' button with data-tab='overview' (or similar)
- Overview is the default active tab (not Agents)
- Overview panel displays module names from buildplan
- Overview panel displays module descriptions
- A dependency visualization is present (text-based flow like 'A -> B' or similar visual)
- Buildplan risks are shown if present

PASS CRITERIA:
- The HTML contains an Overview tab that is active by default
- The JavaScript fetches buildplan data and renders module names, descriptions, and dependency edges