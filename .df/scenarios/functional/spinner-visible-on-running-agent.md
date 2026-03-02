---
name: spinner-visible-on-running-agent
type: functional
spec_id: run_01KJNFM38M9TN3Y79CGKB55ZBY
created_by: agt_01KJNFM38P9V22778TGNHSPE8M
---

## Spinner Visible on Running Agent

### Preconditions
- A pipeline run is active with at least one agent in 'running' status
- Dashboard is served via 'dark dash' and loaded in a browser

### Test Steps
1. Start a build: 'dark build run <spec-id>'
2. Open dashboard in browser (http://localhost:3141)
3. Select the active run from the sidebar
4. Switch to the Agents tab
5. Locate the agent card with status 'running'

### Expected Results
- The agent card for the running agent displays an animated CSS spinner (bouncing dots or rotating ring) adjacent to the 'Running' status badge
- The spinner is visually animated (not static) — verify by observing continuous motion
- The spinner element uses CSS-only animation (no JS requestAnimationFrame, no external assets)
- Inspect the HTML: the spinner should be an element with class 'agent-spinner' containing child span elements
- Inspect CSS: the animation should reference a @keyframes rule (e.g., 'bounce-dots')
- The spinner fits within the agent card layout without overflow or misalignment
- The dark theme aesthetic is maintained (spinner uses theme-consistent colors like var(--accent-green) or similar)

### Pass/Fail Criteria
- PASS: Animated spinner visible next to Running badge, CSS-only, no layout breakage
- FAIL: No spinner visible, static indicator only, JavaScript-based animation, or layout broken