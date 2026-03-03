---
name: continue-still-starts-fresh-on-failure
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start a build. Let a builder agent fail (call dark agent fail {agentId} --error 'test failure'). Verify run status is 'failed'. ACTIONS: (1) Run dark continue {runId}. EXPECTED: A FRESH worktree is created for the failed module's new builder. The old failed worktree is NOT reused. PASS CRITERIA: (a) New builder agent gets a new worktree_path (different from the failed agent's path). (b) The new worktree is empty (no prior commits from failed attempt). (c) dark continue does NOT preserve the failed worktree. (d) This behavior is UNCHANGED from before the pause/resume feature.