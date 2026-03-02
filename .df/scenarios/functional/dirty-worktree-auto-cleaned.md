---
name: dirty-worktree-auto-cleaned
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

SCENARIO: Builder completes without committing all changes. The merge phase sanitizes and commits remaining work. Rebase succeeds.

SETUP:
1. Create a git repo with an initial commit on main.
2. Create a worktree branch (e.g., 'dirty-builder') from main.
3. In the worktree, create and commit a file: committed.ts with content 'export const a = 1;'
4. In the worktree, create an UNCOMMITTED file: uncommitted.ts with content 'export const b = 2;'
5. Back on main, create and commit a different file: main-change.txt with content 'main change'

EXECUTION:
6. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED RESULTS:
- result.success === true
- result.mergedBranches.length === 1
- result.failedBranches.length === 0
- Both committed.ts AND uncommitted.ts exist on main after merge
- The worktree was clean (git status --porcelain empty) before rebase ran

PASS CRITERIA:
- The sanitization step auto-committed uncommitted.ts before rebase
- The rebase succeeded (no 'dirty working tree' error)
- Both files are present in the merged main branch