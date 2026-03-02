---
name: node-modules-removed-before-rebase
type: functional
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Setup: Create a git repo with initial commit. Create a worktree branch. In the worktree, create a node_modules/ directory with some files (e.g., node_modules/.package-lock.json, node_modules/lodash/index.js). Do NOT gitignore them (simulating old worktree created before protection fix). Stage and commit code changes alongside node_modules. Also leave node_modules/some-new-pkg/index.js unstaged.

Steps:
1. Call the rebase-and-merge flow with this worktree.
2. Pre-rebase sanitization should:
   a. 'rm -rf node_modules/' from the worktree filesystem
   b. 'git rm --cached' any node_modules files from the index
   c. 'git add -A' remaining changes
   d. Commit sanitization
   e. Verify clean tree
3. Rebase should succeed.
4. Merge into main should succeed.

Expected:
- rebaseAndMerge returns success=true
- No node_modules/ directory or files on main after merge
- Legitimate code files ARE present on main after merge
- git log on main shows no node_modules entries in the merge

Pass/fail: PASS if merge succeeds AND no node_modules files exist on main. FAIL if any node_modules content leaks into main or rebase fails due to excessive files.