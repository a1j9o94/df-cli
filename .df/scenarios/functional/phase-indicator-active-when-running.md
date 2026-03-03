---
name: phase-indicator-active-when-running
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Phase indicator in run header is animated when run.status === 'running' and static otherwise.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Verify CSS class .phase-indicator exists as an 8px circle (border-radius: 50%)
2. Verify .phase-indicator.active has animation: pulse
3. Verify the base .phase-indicator has background: var(--text-muted) and no animation
4. In the renderRunHeader JS function, verify a phase-indicator span is rendered
5. Verify the JS conditionally adds 'active' class when run.status === 'running' (using ternary or conditional)
6. The phase indicator should be distinct from the auto-refresh-indicator (different CSS class)
Expected output: Phase dot pulses green when run is actively running; stays static muted when not running.
Pass criteria: .phase-indicator.active CSS contains animation: pulse; renderRunHeader JS contains conditional logic checking run.status === 'running' to add 'active' class; .phase-indicator and .auto-refresh-indicator are separate CSS classes.