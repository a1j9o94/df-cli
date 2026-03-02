---
name: main-repo-stashed-and-restored
type: functional
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Setup: Create a git repo with initial commit. Create a worktree branch with a committed feature. On the main repo, modify .claude/CLAUDE.md (or another file) WITHOUT committing — leave it as an uncommitted change in the main repo working tree.

Steps:
1. Call the merge phase (executeMergePhase or equivalent flow).
2. Before merge operations, the code should detect main has uncommitted changes.
3. It should 'git stash' the main repo's dirty state.
4. Proceed with rebase-and-merge of the worktree branch.
5. After all merges complete, 'git stash pop' to restore the uncommitted changes.
6. Also verify no node_modules/ leaked into git tracking on main.

Expected:
- Merge succeeds without 'dirty working tree' errors
- The worktree feature is merged into main
- The uncommitted .claude/CLAUDE.md change is restored after merge (git stash pop)
- git status on main shows the original uncommitted change is back
- No stash entries remain (stash was popped)

Pass/fail: PASS if merge succeeds AND the original uncommitted changes on main are preserved after merge. FAIL if merge errors with 'dirty working tree' OR if uncommitted changes are lost.