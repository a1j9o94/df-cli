---
name: resume-after-budget-exceeded
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Resume after budget exceeded mid-build with new budget flag

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Run failed due to budget check after a phase or mid-build (error contains 'budget')
- Buildplan has 3 modules: mod-X, mod-Y, mod-Z (mod-Y depends on mod-X, mod-Z depends on mod-Y)
- mod-X builder completed, mod-Y failed or never started due to budget cap
- events table has phase-completed for scout, architect, plan-review
- Original run had a budget of e.g. 5 USD

STEPS:
1. Run: dark continue <run-id> --budget-usd 20
2. getResumePoint() returns 'build'
3. getCompletedModules() returns Set{'mod-X'}
4. Engine resets run status to 'running'
5. The new budget (20 USD) is applied to the run context — replacing or adding to the original budget
6. Engine emits 'run-resumed' event: { skippedPhases: ['scout','architect','plan-review'], resumeFrom: 'build', completedModules: ['mod-X'], newBudget: 20 }
7. executeBuildPhase() spawns builder for mod-Y (mod-X already done)
8. mod-Y completes, then mod-Z is spawned
9. Budget checks pass with the new 20 USD limit
10. Pipeline completes through integrate, evaluate, merge

EXPECTED OUTPUTS:
- New budget applied (20 USD)
- mod-X not rebuilt
- mod-Y and mod-Z get new builders
- Pipeline completes without hitting budget cap
- run.status === 'completed'

PASS CRITERIA:
- run.status === 'completed'
- Budget tracking shows the new limit of 20 USD (not original 5)
- No new builder for mod-X
- New builders for mod-Y and mod-Z both completed
- events table has 'run-resumed' event with budget metadata