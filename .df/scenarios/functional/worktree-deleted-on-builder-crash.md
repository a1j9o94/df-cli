---
name: worktree-deleted-on-builder-crash
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: Engine deletes worktree when builder crashes, losing partial work

PRECONDITIONS:
- Builder agent running in worktree at /tmp/df-worktrees/module-xyz
- Builder has made 2 commits before crashing

STEPS:
1. Check engine.ts PID-dead code paths (~line 446, ~952)
2. When process exits without completing, engine calls removeWorktree()

CURRENT BEHAVIOR (engine.ts):
if (info.worktreePath && info.worktreePath !== projectRoot) {
  try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
}

EXPECTED:
- Should NOT remove worktree if it contains commits since HEAD
- Should check: git log --oneline HEAD..worktree-branch -- do commits exist?
- If commits exist, preserve worktree for resume

PASS CRITERIA:
- Worktree with commits preserved after crash
- FAIL if removeWorktree is called unconditionally on crash (current behavior)