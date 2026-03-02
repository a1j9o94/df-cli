---
name: loading-spinner-agents-panel
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Loading spinner appears in agents panel during data fetch.

PRECONDITIONS:
- Dashboard server is running (dark dash)
- At least one run exists in the database with agents

STEPS:
1. Open dashboard in browser at http://localhost:3141
2. Click on a run card in the sidebar to select it
3. Observe the agents panel (#agents-container) IMMEDIATELY after clicking

EXPECTED:
- A loading indicator (spinner, skeleton, or animated element) should be visible inside the agents panel (#agents-container or a sibling loading element) BEFORE the agent data arrives
- The loading indicator must have a visually distinct animation (CSS animation or transition) — not just static text
- After agent data loads, the loading indicator is replaced with actual agent cards

VERIFICATION:
- The generated HTML from generateDashboardHtml() should contain CSS classes for loading indicators (e.g., spinner, skeleton-loader, or loading-overlay)
- The generated JS in generateScript() should show a loading state before calling fetchJson for agents
- Test: generateDashboardHtml() output contains a loading indicator element associated with the agents panel
- Test: The JS code sets loading state before the fetch call and clears it after