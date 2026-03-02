---
name: active-phase-indicator
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Active pipeline phase shows animated indicator in run header.

PRECONDITIONS:
- Dashboard server running
- At least one run exists with status 'running' and a non-null current_phase

STEPS:
1. Open dashboard and select a run with status 'running'
2. Observe the run header section showing the phase

EXPECTED:
- The phase display in the run header should show an animated indicator when the run status is 'running' (e.g., spinning icon next to phase name, pulsing dot, animated progress element)
- The animation should be visually clear — not subtle opacity changes that already exist for other elements
- When the run status is 'completed' or 'failed', NO phase animation should appear

VERIFICATION:
- Test: generateDashboardHtml() CSS contains animation styles for phase indicators
- Test: The renderRunHeader() JS function conditionally adds an animated element when run.status is 'running'
- The phase indicator animation should be distinct from the existing auto-refresh pulse animation in the header