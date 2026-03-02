---
name: ui-displays-estimated-cost-indicator
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

SCENARIO: Dashboard HTML includes CSS and JS to visually distinguish estimated costs.

PRECONDITIONS:
- Dashboard server is running

STEPS:
1. GET / (root) to receive the dashboard HTML
2. Inspect the returned HTML string

EXPECTED OUTPUT:
- The HTML MUST contain CSS styling for estimated costs (e.g., a class like 'cost-estimated' or 'estimate-indicator')
- The renderAgents JavaScript function MUST check for the 'isEstimate' field and render differently
- Estimated costs should display with a tilde prefix (e.g., '~$0.50') or other visual indicator
- The CSS should make estimated costs visually distinct (different color, opacity, font-style, or similar)

PASS/FAIL:
- PASS if the HTML contains: (a) CSS for estimated cost styling, (b) JS that checks isEstimate field, (c) visual prefix or indicator for estimated values
- FAIL if estimated costs are rendered identically to actual costs with no distinction