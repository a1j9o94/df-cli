---
name: resume-after-partial-build
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: Resume after partial build (2 of 3 modules completed)

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Buildplan is active with 3 modules: mod-A, mod-B, mod-C
- Dependencies: mod-C depends on mod-A and mod-B (mod-A and mod-B are independent)
- agents table has:
  - architect agent: status='completed'
  - builder for mod-A: status='completed', worktree_path='/tmp/df-worktrees/mod-A-xxxx'
  - builder for mod-B: status='completed', worktree_path='/tmp/df-worktrees/mod-B-xxxx'
  - builder for mod-C: status='failed', worktree_path=NULL (cleaned up on failure) or stale path
- Worktrees for mod-A and mod-B still exist on disk at their stored paths
- Events table has phase-completed for scout, architect, plan-review but NOT for build

STEPS:
1. Run: dark continue <run-id>
2. getResumePoint() determines resume from 'build' (last incomplete phase)
3. getCompletedModules() returns Set{'mod-A', 'mod-B'}
4. Engine resets run status to 'running'
5. Engine emits 'run-resumed' event: { skippedPhases: ['scout','architect','plan-review'], resumeFrom: 'build', completedModules: ['mod-A','mod-B'] }
6. executeBuildPhase() pre-populates completedModules with mod-A, mod-B
7. getReadyModules() sees mod-C's deps (mod-A, mod-B) are satisfied
8. Only ONE builder is spawned — for mod-C
9. mod-C builder completes
10. Pipeline continues: integrate, evaluate-functional, evaluate-change, merge

EXPECTED OUTPUTS:
- Only 1 new builder agent spawned (for mod-C)
- No new agents spawned for mod-A or mod-B
- mod-A and mod-B worktrees are NOT recreated (existing paths reused)
- mod-C gets a new worktree
- Total builder agents in DB: 4 (original mod-A completed, original mod-B completed, original mod-C failed, new mod-C completed)
- Run completes successfully

PASS CRITERIA:
- SELECT COUNT(*) FROM agents WHERE run_id=? AND role='builder' AND status='completed' returns 3 (mod-A original, mod-B original, mod-C new)
- SELECT COUNT(*) FROM agents WHERE run_id=? AND role='builder' returns 4 (includes failed mod-C)
- No new worktree created at mod-A or mod-B paths
- New worktree created for mod-C
- run.status === 'completed'