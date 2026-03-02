---
name: progress-bar-animates-active-phase
type: functional
spec_id: run_01KJNFM38M9TN3Y79CGKB55ZBY
created_by: agt_01KJNFM38P9V22778TGNHSPE8M
---

## Progress Bar Animates During Active Phase

### Preconditions
- A pipeline run is in progress (status 'running')
- The run has at least one completed module and at least one still in progress
- Dashboard is open showing the run details

### Test Steps
1. Open the dashboard and select an active run
2. Observe the progress bar in the run header area
3. Observe the progress bar in the run card in the sidebar
4. Compare with a completed run's progress bars
5. Inspect the CSS applied to the progress-fill element

### Expected Results
- Active run progress bars:
  - The '.progress-fill' element has an '.active' CSS class applied
  - The fill displays a visible animation: either a pulsing/breathing opacity change OR a moving gradient stripe (barber pole effect)
  - The animation is continuous and clearly distinguishable from a static fill
  - Animation uses @keyframes rule (e.g., 'barber-pole' or 'progress-pulse')
  - The fill color remains green-based (var(--accent-green)) with animation overlay
- Phase-specific behavior:
  - Completed phases (100% fill): solid green, NO animation
  - Failed phases: solid red (var(--accent-red)), NO animation
  - Pending phases (0% fill): gray background, NO animation
  - Current/active phase: green fill WITH animation
- Animation is subtle — not overly distracting but clearly visible

### Pass/Fail Criteria
- PASS: Progress bar fill has visible CSS animation during active phase, static for other states
- FAIL: No animation on active progress bar, animation on completed/pending/failed bars, or JS-based animation