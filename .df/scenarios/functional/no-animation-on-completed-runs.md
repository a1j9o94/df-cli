---
name: no-animation-on-completed-runs
type: functional
spec_id: run_01KJNFM38M9TN3Y79CGKB55ZBY
created_by: agt_01KJNFM38P9V22778TGNHSPE8M
---

## No Animation on Completed Runs

### Preconditions
- At least one completed run exists in the pipeline history
- At least one active (running) run also exists for comparison
- Dashboard is open

### Test Steps
1. Open dashboard and observe sidebar run cards
2. Click on a COMPLETED run to select it
3. Inspect all visual elements: run card, progress bar, agent cards
4. Compare with the active run's visual indicators
5. Switch between completed and active runs multiple times

### Expected Results
- Completed run card in sidebar:
  - NO border glow or pulse animation
  - No '.alive' CSS class on the run card element
  - Static border styling only
- Completed run progress bar:
  - Solid green fill at 100% (or appropriate percentage)
  - NO animation on the progress-fill element
  - No '.active' CSS class on progress-fill
- Completed run agent cards:
  - NO animated spinners on any agent card
  - Completed agents show static checkmark indicators
  - Failed agents (if any) show static X indicators
  - No @keyframes animations running on any element within the completed run view
- Active run (for comparison):
  - DOES show sidebar card pulse/glow
  - DOES show progress bar animation
  - DOES show agent spinner(s)
- The auto-refresh indicator (green dot in header) continues its pulse animation regardless — this is dashboard-level, not run-level

### Pass/Fail Criteria
- PASS: Zero animations visible on completed run elements; animations only present on active run elements
- FAIL: Any animation visible on completed run cards/progress bars/agent cards