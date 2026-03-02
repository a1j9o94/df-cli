---
name: dirty-worktree-auto-cleaned
type: functional
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Setup: Create a git repo with initial commit. Create a worktree branch. In the worktree, create a new file (e.g., feature.ts with content 'export const x = 1;') but do NOT git add or commit it (simulating builder that forgot to commit). Also advance main with a separate commit so rebase is non-trivial.

Steps:
1. Call the rebase-and-merge flow with the dirty worktree path.
2. The pre-rebase sanitization should detect unstaged changes.
3. It should 'git add -A' the unstaged file.
4. It should create a sanitization commit 'df: sanitize worktree before merge'.
5. It should verify git status --porcelain is empty.
6. The rebase should then succeed.
7. The merge into main should succeed.

Expected:
- rebaseAndMerge returns success=true
- The feature.ts file appears on main after merge
- No 'dirty working tree' errors
- A commit with message containing 'sanitize worktree' exists in the branch history

Pass/fail: PASS if merge succeeds AND feature.ts is present on main. FAIL if rebase errors with dirty tree or merge fails.