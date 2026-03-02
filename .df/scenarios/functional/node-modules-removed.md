---
name: node-modules-removed
type: functional
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

PRECONDITION: A git repo with main branch and a worktree branch. The worktree has node_modules/ directory present in the working tree (and possibly tracked by git since the worktree was created before the .gitignore fix). STEPS: (1) Create main repo with initial commit. (2) Create worktree branch. (3) In worktree: create node_modules/some-package/index.js with some content. Also 'git add node_modules/' and commit, so node_modules is tracked. (4) Call sanitizeWorktree(worktreePath). (5) Call rebaseWorktreeBranch(worktreePath, 'main'). (6) Merge via rebaseAndMerge(). EXPECTED: sanitizeWorktree runs 'git rm --cached' on node_modules/ entries to untrack them, then 'rm -rf node_modules/' to delete from working tree. After sanitization, node_modules/ does not exist in the worktree filesystem. After merge into main, node_modules/ does NOT appear in main's tracked files. PASS CRITERIA: After sanitizeWorktree: existsSync(join(worktreePath, 'node_modules')) === false. After rebaseAndMerge: git ls-files on main does not include any node_modules/ entries. MergeResult.success === true. FAIL CRITERIA: node_modules/ files appear in main's git index after merge, or rebase fails because git tries to merge 10K+ dependency files.