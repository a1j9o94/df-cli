---
name: worktree-crash-removes-commits
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPD42HJG0YB8BSQEHB09TFK
---

SCENARIO: When a builder crashes after making commits, the engine calls removeWorktree() which destroys the commits. This is a data loss bug. PRECONDITIONS: A builder has made 2+ commits in its worktree, then the builder process exits without calling complete. STEPS: 1. Builder makes commits in worktree 2. Builder PID dies (process exits) 3. Engine detects PID death (runtimeStatus=stopped) 4. Engine calls removeWorktree(info.worktreePath) at engine.ts lines ~1018-1019 and ~439-440. EXPECTED: Worktree with commits should be PRESERVED for resume, not deleted. CURRENT BEHAVIOR: removeWorktree is called unconditionally on crash. PASS CRITERIA: removeWorktree NOT called when worktree has commits (git log shows commits after HEAD). FAIL if removeWorktree called regardless of commit state.