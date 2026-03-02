---
name: node-modules-removed
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

SCENARIO: Worktree has node_modules/ in working tree (installed by builder during TDD). Sanitization deletes it. Rebase doesn't try to merge 10K dependency files.

SETUP:
1. Create a git repo with an initial commit on main.
2. Create a worktree branch (e.g., 'has-modules') from main.
3. In the worktree, create app.ts with content: import x from 'x';
4. Create node_modules/x/index.js with content: module.exports = 1;
5. Force-add all: git add -f -A
6. Commit: git commit -m 'App with node_modules'

EXECUTION:
7. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED RESULTS:
- result.success === true
- app.ts exists on main after merge (real work preserved)
- node_modules/ directory does NOT exist on main after merge
- node_modules/ is NOT tracked in git ls-files on main
- The rebase did not conflict on node_modules files

PASS CRITERIA:
- sanitizeWorktree removed node_modules/ from the worktree filesystem (rm -rf)
- sanitizeWorktree removed node_modules files from git tracking (git rm --cached)
- The merge brought only real source files, not dependencies
- existsSync(join(mainRepoPath, 'node_modules')) === false