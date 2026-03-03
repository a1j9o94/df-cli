---
name: phase-stepper-all-8-phases
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: Phase stepper shows all 8 phases with distinct visual states.

PRECONDITIONS:
- Database has a run in 'build' phase (current_phase='build')
- Phases endpoint returns 8 phases: scout, architect, plan-review, build, integrate, evaluate-functional, evaluate-change, merge
- Dashboard server is running

TEST STEPS:
1. Fetch GET /api/runs/:id/phases for a run in 'build' phase
2. Verify response contains exactly 8 phase objects
3. Verify phases before 'build' have status='completed'
4. Verify 'build' phase has status='active'
5. Verify phases after 'build' have status='pending' (or 'skipped' where applicable)
6. Fetch GET / and inspect the phase timeline HTML rendering
7. Verify completed phases have distinct visual style (e.g. green color, phase-completed class)
8. Verify active phase has distinct visual style (e.g. blue, animated, phase-active class)
9. Verify pending phases have distinct muted style (phase-pending class)
10. Verify phase labels use friendly names ('Scout', 'Architect', 'Build', 'Evaluate') not raw IDs ('evaluate-functional')

EXPECTED RESULTS:
- All 8 phases rendered in the stepper
- Completed phases visually distinct from active and pending
- Active phase highlighted (different color, animation, or emphasis)
- Pending phases muted/dimmed
- Phase labels are human-readable

PASS CRITERIA:
- Phase timeline renders 8 phases
- CSS classes differentiate completed/active/pending/skipped states
- Phase labels use PHASE_LABELS mapping (friendly names)