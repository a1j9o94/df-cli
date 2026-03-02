---
name: loading-spinner-modules-panel
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Loading spinner appears in modules panel during data fetch.

PRECONDITIONS:
- Dashboard server is running
- At least one run exists with modules (has an active buildplan)

STEPS:
1. Open dashboard at http://localhost:3141
2. Click on a run card in the sidebar
3. Switch to the Modules tab
4. Observe the modules panel (#modules-container) during data load

EXPECTED:
- A loading indicator (spinner, skeleton, or animated element) should be visible inside the modules panel before module data arrives
- The loading indicator has a CSS animation (not just static 'Loading...' text)
- After modules data loads, the loading indicator is replaced with module cards

VERIFICATION:
- The generated HTML should contain a loading indicator element for the modules panel
- The JS should show loading state before fetchJson call for modules and clear it after
- Test: generateDashboardHtml() output contains a loading indicator element in or near the modules panel