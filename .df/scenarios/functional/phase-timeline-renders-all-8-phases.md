---
name: phase-timeline-renders-all-8-phases
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJS1H35CGTM3ZRT2YN5H2FZN
---

SCENARIO: The dashboard renders a full phase timeline with all 8 pipeline phases.

PRECONDITIONS:
- Dashboard server running with a run in status 'running', current_phase 'build'

STEPS:
1. Open dashboard, select the running run
2. Inspect the run header HTML

EXPECTED:
- The run header contains rendered elements for ALL 8 phases: scout, architect, plan-review, build, integrate, evaluate-functional, evaluate-change, merge
- Phases before 'build' (scout, architect, plan-review) are rendered with a 'completed' CSS class
- The 'build' phase is rendered with an 'active' CSS class and animation
- Phases after 'build' (integrate, evaluate-functional, evaluate-change, merge) are rendered with a 'pending' CSS class
- The phase timeline is NOT a single dot+label but a horizontal sequence of all phases

VERIFICATION:
- Grep the renderRunHeader JS for rendering multiple phases (not just the current one)
- CSS must contain .phase-completed, .phase-active, .phase-pending classes
- A PHASE_ORDER array or equivalent must drive the rendering (not hardcoded phase names in the HTML)