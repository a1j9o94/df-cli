---
name: pause-during-different-phases
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP AND ACTIONS: Test pausing during three different pipeline phases. TEST A - Pause during architect phase: (1) Start build. (2) While architect agent is running, run dark pause {runId}. (3) Verify architect agent gets 'paused' status. (4) Run dark resume. (5) Verify pipeline resumes from architect phase (not from beginning). TEST B - Pause during build phase: (1) Start build past architect. (2) While builders are running, pause. (3) Resume. (4) Verify build phase resumes with preserved worktrees. TEST C - Pause during evaluate phase: (1) Start build past build phase. (2) While evaluator is running, pause. (3) Resume. (4) Verify evaluator re-spawns fresh (non-builder agents spawn fresh per spec). PASS CRITERIA: (a) All three phase-pause scenarios resume from the PAUSED phase, not from beginning. (b) Builder agents get worktree preservation on pause. (c) Non-builder agents (architect, evaluator) re-spawn fresh on resume. (d) current_phase field in run record correctly reflects the paused phase. (e) run-paused and run-resumed events include phase information.