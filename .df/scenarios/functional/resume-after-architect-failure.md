---
name: resume-after-architect-failure
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Resume after architect failure

PRECONDITIONS:
- A spec exists in the .df directory
- dark build was run and failed during the architect phase (e.g., agent crash, invalid buildplan JSON)
- The runs table has a row with status='failed', current_phase='architect'
- No buildplan exists in buildplans table for this run (architect never completed)
- Events table has 'phase-started' for 'architect' but NO 'phase-completed' for 'architect'

STEPS:
1. Run: dark continue (no args)
2. The command should auto-select the single failed run
3. getResumePoint() should determine resume from 'architect' phase (since scout auto-completes and architect has no phase-completed event)
4. Engine resets run status from 'failed' to 'running'
5. Engine emits 'run-resumed' event with metadata: { skippedPhases: ['scout'], resumeFrom: 'architect' }
6. Engine re-executes architect phase (spawns new architect agent)
7. Architect completes, buildplan is created
8. Pipeline continues through remaining phases: plan-review, build, integrate, evaluate-functional, evaluate-change, merge

EXPECTED OUTPUTS:
- Run status transitions: failed -> running -> completed
- A 'run-resumed' event exists in events table with correct metadata
- A new architect agent is spawned (the old failed one remains in DB with status='failed')
- Scout phase is NOT re-executed (no new scout agent spawned)
- All subsequent phases execute normally
- Final run status is 'completed'

PASS CRITERIA:
- run.status === 'completed' at end
- events table contains exactly one 'run-resumed' event for this run
- No duplicate scout agent exists (only the original)
- A new architect agent with status='completed' exists
- Buildplan exists and is active