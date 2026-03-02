---
name: protected-files-removed
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

SCENARIO: Worktree has .df/state.db-wal committed. Sanitization removes it before rebase. Merge doesn't corrupt main DB.

SETUP:
1. Create a git repo with an initial commit on main.
2. Create a worktree branch (e.g., 'has-protected') from main.
3. In the worktree, create a feature file: feature.ts with content 'export function feature() {}'
4. In the worktree, create .df/state.db-wal with content 'stale wal data'
5. Force-add all files: git add -f -A
6. Commit: git commit -m 'Feature with state.db'

EXECUTION:
7. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED RESULTS:
- result.success === true
- feature.ts exists on main (real work preserved)
- .df/state.db-wal does NOT exist on main (protected file removed)
- .df/state.db-wal is NOT in git ls-files on main (not tracked)

PASS CRITERIA:
- The sanitization step removed .df/state.db-wal from git tracking before rebase
- The feature file was preserved through the merge
- No protected files leaked into the main branch
- Verify by running: git ls-files on main should not contain any .df/state.db* files