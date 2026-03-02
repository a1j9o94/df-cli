---
name: phase-stepper-pipeline
type: functional
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

SETUP: Start dashboard with a database containing a run whose current_phase is 'build' (meaning scout, architect, and plan-review are completed). STEPS: 1. GET / (HTML) and select the run. 2. On the Overview tab, find the phase pipeline bar (horizontal stepper). 3. Verify the stepper shows all pipeline phases: scout, architect, plan-review, build, integrate, evaluate, merge. 4. Verify completed phases (scout, architect, plan-review) are styled differently from the current phase (build). 5. Verify the current phase (build) is highlighted/active with distinct styling. 6. Verify pending phases (integrate, evaluate, merge) are styled as not-yet-reached (dimmed, gray, or outlined). 7. Phase names should be human-readable (e.g. 'Plan Review' not 'plan-review', 'Evaluating' not 'evaluate-functional'). PASS CRITERIA: - A horizontal phase stepper/pipeline bar is visible on the Overview tab - All pipeline phases are represented - Completed phases have distinct styling from current and pending - Current phase is visually highlighted - Pending phases are visually dimmed/inactive - Phase labels are human-readable (no raw snake_case)