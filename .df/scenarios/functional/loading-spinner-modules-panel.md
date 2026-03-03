---
name: loading-spinner-modules-panel
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Loading spinner appears in modules panel during data fetch.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Parse the generated HTML string
2. Find the loadModules function in the JS section
3. Verify that before the fetchJson call for modules, container.innerHTML is set to a loading-spinner element
4. Verify the loading-spinner text says 'Loading modules' (with ellipsis)
Expected output: The HTML contains a loading-spinner div set before the fetch call in loadModules.
Pass criteria: loading-spinner innerHTML appears before fetchJson modules call in the JS; the spinner uses the same CSS class as agents panel.