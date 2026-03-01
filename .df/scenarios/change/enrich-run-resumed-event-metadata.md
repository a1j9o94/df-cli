---
name: enrich-run-resumed-event-metadata
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNC3VME1YR7HSH2CQYPM6EX
---

CHANGEABILITY SCENARIO: Enrich run-resumed event with full metadata

DESCRIPTION:
The run-resumed event in engine.ts:173 currently only emits { fromPhase: resumePhase }. It should include skippedPhases, completedModules, and newBudget for observability.

MODIFICATION STEPS:
1. In engine.ts resume() method, compute skippedPhases: PHASE_ORDER.slice(0, startIdx)
2. Convert previouslyCompletedModules Set to array
3. Include budgetUsd in event data
4. Update createEvent call: createEvent(db, runId, 'run-resumed', { fromPhase, skippedPhases, completedModules, newBudget })

AFFECTED AREAS:
- src/pipeline/engine.ts — modify ONE createEvent call (~5 lines changed)

EXPECTED EFFORT:
- ~5 lines changed in 1 file
- No new files, no schema changes

VERIFICATION:
1. Resume a run and check events table for run-resumed event
2. Event data should contain all 4 fields: fromPhase, skippedPhases (array), completedModules (array), newBudget (number|null)
3. getResumePoint() unchanged

PASS CRITERIA:
- Event data contains all 4 metadata fields
- Only engine.ts modified (~5 lines)
- No changes to resume.ts or event schema