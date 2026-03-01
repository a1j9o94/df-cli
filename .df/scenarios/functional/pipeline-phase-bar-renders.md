---
name: pipeline-phase-bar-renders
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Dashboard renders a Pipeline Phase Bar showing all 8 phases

PRECONDITIONS:
- Dashboard server is running
- A run exists with current_phase set

STEPS:
1. Start dashboard server
2. Load the HTML page
3. Inspect the HTML for a section rendering all 8 pipeline phases: scout, architect, plan-review, build, integrate, evaluate-functional, evaluate-change, merge
4. Verify each phase has a visual state: completed (green), current (pulsing/blue), pending (gray), failed (red), skipped (dimmed)
5. For a running run at phase 'build': verify scout/architect/plan-review show green, build shows pulsing, remaining show gray
6. For a failed run at phase 'build': verify build shows red, post-build phases show gray, pre-build show green

EXPECTED OUTPUTS:
- HTML contains all 8 phase names rendered as visible elements
- Each phase element has a CSS class or data attribute indicating its state
- The phase bar is a horizontal visual component (not just text)
- Phase state colors: completed=#3fb950 or green, failed=#f85149 or red, pending=gray

PASS CRITERIA:
- All 8 phases are rendered in the HTML
- Phase states are visually differentiated by color/class
- The phase bar updates when the run's current_phase changes
