---
name: run-resumed-event-includes-skipped-phases
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNBP8YDWBE5G0KK4H7V01R0
---

SCENARIO: run-resumed event must include skippedPhases array, resumeFrom field, completedModules array, and newBudget if applicable.

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Phases scout, architect, plan-review completed
- 1 module completed, 2 remaining

STEPS:
1. Run: dark continue <run-id> --budget-usd 25
2. Inspect the run-resumed event in events table
3. Parse the event data JSON

EXPECTED OUTPUTS:
- Event data contains 'skippedPhases' as an array: ['scout', 'architect', 'plan-review']
- Event data contains 'resumeFrom' with value 'build'
- Event data contains 'completedModules' as an array of module IDs
- Event data contains 'newBudget' with value 25

PASS CRITERIA:
- All four metadata fields present in run-resumed event data
- FAIL if event data only contains { fromPhase: 'build' } without the enriched metadata
- The event data format matches the ResumeOptions contract