---
name: run-resumed-event-metadata
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: run-resumed event contains complete metadata about skipped phases and completed modules

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Phases scout, architect, plan-review have completed
- 2 of 3 builder modules completed

STEPS:
1. Run: dark continue <run-id> --budget-usd 20
2. Engine resumes from build phase
3. Check the run-resumed event in the events table

EXPECTED OUTPUTS:
- Event type = 'run-resumed'
- Event data includes:
  - skippedPhases: array of phases that were skipped (e.g., ['scout', 'architect', 'plan-review'])
  - resumeFrom: the phase being resumed from (e.g., 'build')
  - completedModules: array of already-completed module IDs
  - newBudget: the new budget if --budget-usd was passed

PASS CRITERIA:
- run-resumed event data contains skippedPhases array
- run-resumed event data contains resumeFrom phase name
- run-resumed event data contains completedModules array (if build phase)
- run-resumed event data contains newBudget if budget was overridden
- FAIL if event data only contains { fromPhase: 'build' } without the other metadata
