---
name: resume-after-evaluator-failure
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Resume after evaluator failure — skip all phases up to evaluate

PRECONDITIONS:
- A run exists with status='failed', current_phase='evaluate-functional'
- Events table has phase-completed for: scout, architect, plan-review, build, integrate
- Events table has phase-started for evaluate-functional but NO phase-completed
- All builder agents have status='completed' with valid worktree paths
- Evaluator agent has status='failed'
- Buildplan is active

STEPS:
1. Run: dark continue <run-id>
2. getResumePoint() returns 'evaluate-functional' (first phase without phase-completed)
3. Engine resets run status to 'running'
4. Engine emits 'run-resumed' event: { skippedPhases: ['scout','architect','plan-review','build','integrate'], resumeFrom: 'evaluate-functional' }
5. Engine jumps directly to evaluate-functional phase
6. New evaluator agent is spawned
7. Evaluator completes, pipeline continues to evaluate-change, merge

EXPECTED OUTPUTS:
- No scout, architect, plan-review, build, or integrate agents spawned
- Specifically: NO new builder agents (all modules already completed)
- One new evaluator agent spawned for evaluate-functional
- Pipeline completes through evaluate-change and merge
- run.status === 'completed'

PASS CRITERIA:
- Zero new agents with role='builder' created after resume
- Zero new agents with role='architect' created after resume
- Exactly one new agent with role='evaluator' for evaluate-functional
- Total time significantly less than a full run (phases were skipped, not re-executed)
- run.status === 'completed'
- events table has exactly one 'run-resumed' event