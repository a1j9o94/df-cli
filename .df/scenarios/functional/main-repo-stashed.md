---
name: main-repo-stashed
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

SCENARIO: Main has uncommitted .claude/CLAUDE.md changes. Merge phase stashes, merges builder work, then pops stash. No 'dirty working tree' errors.

SETUP:
1. Create a git repo with an initial commit on main.
2. Create a worktree branch (e.g., 'feature-main-dirty') from main.
3. In the worktree, create feature.ts with content: export const f = 1;
4. git add -A and git commit -m 'Builder feature'
5. On main, create .claude/CLAUDE.md with content: 'session config' (do NOT commit — leave as uncommitted change)

EXECUTION:
6. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED RESULTS:
- result.success === true
- feature.ts exists on main after merge (builder work merged)
- .claude/CLAUDE.md exists on main after merge (stashed and restored)
- Content of .claude/CLAUDE.md contains 'session config' (original content preserved)

PASS CRITERIA:
- sanitizeMainRepo() stashed the uncommitted .claude/CLAUDE.md before merge
- The merge did not fail with 'cannot merge: dirty working tree'
- unstashMainRepo() restored the stashed changes after all merges complete
- The stash pop did not conflict with merged changes
- Both builder work AND original main working tree changes are present