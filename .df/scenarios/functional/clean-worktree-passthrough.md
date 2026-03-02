---
name: clean-worktree-passthrough
type: functional
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Setup: Create a git repo with initial commit. Create a worktree branch. In the worktree, add a new file (feature.ts), stage it, and commit it properly. The worktree has a clean working tree (git status --porcelain returns empty). Advance main with a separate commit.

Steps:
1. Call the rebase-and-merge flow with this clean worktree.
2. Pre-rebase sanitization should:
   a. Detect that git status --porcelain is empty (no unstaged, no protected files in index)
   b. Skip all cleanup steps (no-op)
   c. NOT create any sanitization commit
3. Rebase should succeed normally.
4. Merge into main should succeed.

Expected:
- rebaseAndMerge returns success=true  
- The feature.ts file appears on main
- No extra 'sanitize worktree' commit in branch history
- Sanitization was effectively a no-op

Pass/fail: PASS if merge succeeds normally without any sanitization commits. FAIL if unnecessary sanitization commits are created or if an error occurs on clean worktrees.