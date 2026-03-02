---
name: resume-build-creates-new-worktrees-instead-of-reusing
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPD42HJG0YB8BSQEHB09TFK
---

SCENARIO: executeResumeBuildPhase creates brand new worktrees for incomplete modules instead of reusing the failed builder's existing worktree (which may have commits). PRECONDITIONS: A run with 3 modules - mod-A completed, mod-B failed with commits in worktree. STEPS: 1. Resume the run. 2. executeResumeBuildPhase at engine.ts line 330 calls createWorktree() for mod-B. 3. The failed builder's worktree_path from the DB is never consulted or reused. 4. Previous commits in the old worktree are lost. EXPECTED: Resume should query the failed builder's worktree_path and reuse it if commits exist. PASS CRITERIA: Resume reuses existing worktree with commits for incomplete modules. FAIL if resume always creates fresh worktrees.