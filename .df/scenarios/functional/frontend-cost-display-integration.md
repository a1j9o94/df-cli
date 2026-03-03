---
name: frontend-cost-display-integration
type: functional
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRHDHFNQVQME4TY2F9RVVJM
---

SCENARIO: Frontend must use formatCostDisplay function that checks isEstimate.

STEPS:
1. GET / to retrieve the dashboard HTML
2. Verify the HTML contains a formatCostDisplay function (or equivalent)
3. Verify the function checks agent.isEstimate and renders with tilde prefix
4. Verify CSS class 'cost-estimated' (or similar) exists with visual distinction
5. Verify renderAgents() calls formatCostDisplay instead of plain formatCost

PASS CRITERIA:
- HTML contains a function that takes cost, estimatedCost, isEstimate args
- Function renders '~$X.XXXX' with italic/yellow styling when isEstimate=true
- Function renders '$X.XXXX' normally when isEstimate=false
- CSS provides visual distinction (different color, font-style, or opacity)
- Agent cards use this function for cost display
- Module cards use this function for cost display

FAIL CRITERIA:
- HTML only has formatCost(n) that always shows '$X.XXXX'
- No visual distinction between estimated and actual costs
- No CSS class for estimated cost styling