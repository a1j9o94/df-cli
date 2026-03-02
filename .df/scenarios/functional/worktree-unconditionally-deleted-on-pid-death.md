---
name: worktree-unconditionally-deleted-on-pid-death
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPKN1YNAXDMSCVEDTPT9V4P
---

SETUP: Examine engine.ts PID-dead handling code paths. STEPS: 1. Find all locations in engine.ts where removeWorktree() is called after detecting a dead PID. 2. Check if there is ANY conditional logic before removeWorktree (e.g., checking for existing commits via git log). 3. Verify that builder partial work (commits in worktree) would be destroyed on crash. PASS CRITERIA: - Before calling removeWorktree(), the engine checks for existing commits in the worktree branch - If commits exist, the worktree is preserved and its path is recorded for resume - removeWorktree() is only called when the worktree has no commits FAIL CRITERIA: - removeWorktree() is called unconditionally when a builder PID dies - No git log check exists before worktree removal - Partial work (commits) is lost on builder crash, creating data loss