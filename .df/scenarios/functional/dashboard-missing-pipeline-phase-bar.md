---
name: dashboard-missing-pipeline-phase-bar
type: functional
spec_id: run_01KJNDAHXBMY9Y83JQ9BR2TK6M
created_by: agt_01KJNEC78E6VHYQCTS93K3EPTW
---

SCENARIO: Dashboard HTML has no Pipeline Phase Bar component

PRECONDITIONS:
- Dashboard server running

STEPS:
1. GET / (HTML page)
2. Search for any rendering of the 8 pipeline phases: scout, architect, plan-review, build, integrate, evaluate-functional, evaluate-change, merge
3. Search for CSS classes or elements related to phase visualization

EXPECTED:
- A horizontal phase bar showing all 8 phases with color-coded states (completed=green, current=blue/pulsing, pending=gray, failed=red)
- Current: UI module (index.ts) has NO phase bar rendering at all
- renderRunHeader shows phase as a text stat, but doesn't visualize all 8 phases

PASS CRITERIA:
- All 8 phase names rendered as visible HTML elements
- Each phase has visual state differentiation (color/class)
- FAIL if no phase bar component exists in the HTML output