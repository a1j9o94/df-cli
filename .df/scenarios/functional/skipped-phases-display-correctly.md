---
name: skipped-phases-display-correctly
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

SCENARIO: Skipped pipeline phases display with correct 'skipped' visual state.

PRECONDITIONS:
- A run 'run_skip_test' exists with status 'running', current_phase 'build', mode='quick'
- Run config has skip_architect=false
- Active buildplan has module_count=1

STEPS:
1. Start dashboard server
2. GET /api/runs/run_skip_test/phases

EXPECTED RESULTS:
- The 'integrate' phase is marked as 'skipped' (module_count <= 1 means integration is skipped)
- The 'evaluate-change' phase is marked as 'skipped' (mode='quick' means change evaluation is skipped)
- The other phases are correctly marked: scout=completed, architect=completed, plan-review=completed, build=active, evaluate-functional=pending, merge=pending
- In the dashboard UI, skipped phases are visually distinct from pending phases (e.g., strikethrough, dimmed with a skip icon, or dashed border)

PASS CRITERIA:
- The phases endpoint checks shouldSkipPhase from pipeline/phases.ts for each phase
- The context passed to shouldSkipPhase includes: skip_architect (from run config), module_count (from buildplan), mode (from run)
- Skipped phases have a distinct CSS class (e.g., 'phase-skipped') that renders them differently from both 'pending' and 'completed'