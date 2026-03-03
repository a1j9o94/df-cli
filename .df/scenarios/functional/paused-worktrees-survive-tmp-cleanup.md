---
name: paused-worktrees-survive-tmp-cleanup
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start a build. Let a builder create files and commit in its /tmp/ worktree. Pause the build via dark pause {runId}. ACTIONS: (1) Verify worktree was moved from /tmp/df-worktrees/... to .df/worktrees/paused/{moduleId}/. (2) Delete the original /tmp/ path (simulating OS cleanup). (3) Run dark resume {runId}. EXPECTED: Resume succeeds using the .df/worktrees/paused/ copy. Builder gets the preserved worktree with all prior commits intact. PASS CRITERIA: (a) After pause: .df/worktrees/paused/{moduleId}/ exists and contains the worktree. (b) Original /tmp/ path no longer needed (can be deleted). (c) After resume: new builder agent spawned with worktree_path pointing to .df/worktrees/paused/{moduleId}/. (d) git log in the resumed worktree shows all commits from before the pause.