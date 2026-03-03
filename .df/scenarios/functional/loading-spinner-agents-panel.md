---
name: loading-spinner-agents-panel
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Loading spinner appears in agents panel during data fetch.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Parse the generated HTML string
2. Find the loadAgents function in the JS section
3. Verify that before the fetchJson call for agents, container.innerHTML is set to a loading-spinner element
4. Verify the loading-spinner text says 'Loading agents' (with ellipsis)
5. Verify the loading-spinner CSS class exists with animation: spin property
6. Verify @keyframes spin is defined with rotate(360deg)
Expected output: The HTML contains a loading-spinner div set before the fetch call in loadAgents, the spinner CSS uses a ::before pseudo-element with border-top trick and spin animation.
Pass criteria: loading-spinner innerHTML appears before fetchJson agents call in the JS; .loading-spinner CSS class includes animation: spin; @keyframes spin rotates 360deg.