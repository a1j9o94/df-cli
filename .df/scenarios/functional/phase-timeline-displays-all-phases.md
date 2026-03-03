---
name: phase-timeline-displays-all-phases
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

SCENARIO: Phase timeline displays all pipeline phases with correct status indicators.

PRECONDITIONS:
- A run exists in the database with id 'run_test1', spec_id 'test-spec', status 'running', current_phase 'build'
- The runs table has the run with created_at set to 5 minutes ago

STEPS:
1. Start the dashboard server on a test port
2. GET /api/runs/run_test1 
3. Navigate to the dashboard HTML page (GET /)
4. Verify the HTML contains phase timeline markup

EXPECTED RESULTS:
- The API response includes a 'phase' field matching 'build'
- The dashboard HTML includes elements for the pipeline phase timeline showing all 8 phases: scout, architect, plan-review, build, integrate, evaluate-functional, evaluate-change, merge
- Phases before 'build' (scout, architect, plan-review) are rendered with a 'completed' visual state (e.g., CSS class 'phase-completed' or checkmark indicator)
- The 'build' phase is rendered with an 'active' visual state (e.g., CSS class 'phase-active' with animation/pulse)
- Phases after 'build' (integrate, evaluate-functional, evaluate-change, merge) are rendered with a 'pending' visual state (e.g., CSS class 'phase-pending' with muted styling)
- The phase timeline renders inline within the run detail header area

PASS CRITERIA:
- The generated HTML from generateDashboardHtml() contains CSS classes for phase-completed, phase-active, and phase-pending states
- The JavaScript renderRunHeader function (or a new renderPhaseTimeline function) correctly maps the current_phase to active, and computes completed/pending from PHASE_ORDER
- Active phase indicator has a CSS animation (pulse, spin, or glow)