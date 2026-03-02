---
name: run-card-sidebar-pulse
type: functional
spec_id: run_01KJNFM38M9TN3Y79CGKB55ZBY
created_by: agt_01KJNFM38P9V22778TGNHSPE8M
---

## Run Card Sidebar Pulse for Active Runs

### Preconditions
- At least one run with status 'running' exists
- At least one run with status 'completed' exists
- Dashboard is open showing the sidebar with run cards

### Test Steps
1. Open dashboard and observe the sidebar run list
2. Identify the running run card and the completed run card
3. Observe the running run card for subtle animation
4. Inspect the HTML/CSS of the running run card

### Expected Results
- Running run card:
  - Has a subtle visual animation indicating it is alive
  - Animation is one of: slow border glow pulse, thin animated stripe at bottom, or similar subtle effect
  - The run card element has class 'alive' (or equivalent) applied when run.status === 'running'
  - Animation uses CSS @keyframes (e.g., 'glow-pulse')
  - Animation cycle is slow (2-4 seconds) — not rapid or distracting
  - The effect is visible at a glance but does not dominate the sidebar
- Completed run card:
  - NO animation, NO 'alive' class
  - Static border and background
- Pending/failed run cards:
  - NO animation, NO 'alive' class
- The pulse does not interfere with the run card click interaction
- The pulse does not cause layout shifts or jitter

### Pass/Fail Criteria
- PASS: Running run cards have subtle CSS animation; non-running cards are static
- FAIL: No animation on running cards, animation on non-running cards, or animation is too aggressive