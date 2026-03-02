---
name: protected-files-removed-before-rebase
type: functional
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Setup: Create a git repo with initial commit. Create a worktree branch. In the worktree, force-add protected files: .df/state.db-wal, .df/state.db-shm, and .claude/CLAUDE.md using 'git add -f'. Commit them. Then make the worktree dirty by modifying .claude/CLAUDE.md again (unstaged).

Steps:
1. Call the rebase-and-merge flow with this worktree.
2. Pre-rebase sanitization should:
   a. 'git rm --cached' the .df/state.db-wal and .df/state.db-shm files
   b. 'git checkout -- .claude/CLAUDE.md' to discard changes
   c. 'git add -A' remaining changes
   d. Commit the sanitization
   e. Verify clean working tree
3. Rebase onto main should succeed.
4. Merge into main should succeed.

Expected:
- rebaseAndMerge returns success=true
- .df/state.db-wal does NOT exist on main after merge
- .df/state.db-shm does NOT exist on main after merge  
- .claude/CLAUDE.md is NOT present in the merged result (or is the main version)
- No state DB corruption

Pass/fail: PASS if merge succeeds AND protected files are absent from main. FAIL if any .df/state.db* or .claude/ files leak into main.