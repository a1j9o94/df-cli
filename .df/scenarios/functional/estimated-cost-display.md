---
name: estimated-cost-display
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Estimated costs display with tilde (~) prefix and distinct visual styling; actual costs display normally.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Verify CSS class .cost-estimated exists with font-style: italic and/or muted color
2. In the renderAgents JS function, verify there is an isEstimate check
3. When isEstimate is true and estimatedCost > 0, the cost should be wrapped in a span.cost-estimated with ~ prefix
4. When isEstimate is false, cost displays normally via formatCost
5. In the renderRunHeader JS function, verify estimated cost is displayed with ~ prefix and cost-estimated class
6. Verify the JS references both cost and estimatedCost fields from the API data
Expected output: Estimated costs appear in italics with ~ prefix; actual costs appear normally.
Pass criteria: .cost-estimated CSS includes font-style: italic or color: var(--text-muted); JS checks isEstimate condition; estimated costs prefixed with ~; cost-estimated span wraps estimated values.