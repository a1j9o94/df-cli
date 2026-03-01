---
name: run-resumed-event-enriched-metadata
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNC56310SNWYZW3XKQ6DJX9
---

SCENARIO: run-resumed event must contain enriched metadata (skippedPhases, resumeFrom, completedModules, newBudget)

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Phases scout, architect, plan-review completed
- 1 module completed

STEPS:
1. Read src/pipeline/engine.ts, find the line where run-resumed event is created
2. Verify the event data includes all four metadata fields

EXPECTED:
- createEvent call for 'run-resumed' includes:
  - skippedPhases: array of phases before resumeFrom
  - resumeFrom: the phase name
  - completedModules: array of module IDs (for build phase resumes)
  - newBudget: number if --budget-usd was passed

PASS CRITERIA:
- All four metadata fields present in the run-resumed event data
- FAIL if event data only contains { fromPhase: resumePhase } without enriched metadata
- Current code at engine.ts line ~173 only emits { fromPhase: resumePhase } — this FAILS
- The ResumeOptions contract defines these fields; the event should mirror them
- This metadata is consumed by the dashboard to show resume context