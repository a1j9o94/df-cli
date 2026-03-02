---
name: protected-files-removed
type: functional
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

PRECONDITION: A git repo with main branch and a worktree branch. The worktree has .df/state.db-wal committed (tracked by git). STEPS: (1) Create main repo with initial commit. (2) Create worktree branch. (3) In worktree: create .df/ directory and write .df/state.db-wal file. git add .df/state.db-wal and commit. (4) Call sanitizeWorktree(worktreePath). (5) Call rebaseWorktreeBranch(worktreePath, 'main'). (6) Merge the worktree branch into main via rebaseAndMerge(). EXPECTED: sanitizeWorktree runs git rm --cached on .df/state.db-wal (removing from tracking). Creates a sanitize commit. After merge into main, .df/state.db-wal does NOT appear in main's tracked files (git ls-files should not include it). PASS CRITERIA: After full rebaseAndMerge, running 'git ls-files' on main repo does NOT list .df/state.db-wal. MergeResult.success === true. FAIL CRITERIA: .df/state.db-wal appears in main's tracked files after merge.