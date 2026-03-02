---
name: clean-worktree-passthrough
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

SCENARIO: Worktree is already clean (builder committed everything properly). Sanitization is a no-op. Rebase proceeds normally.

SETUP:
1. Create a git repo with an initial commit on main.
2. Create a worktree branch (e.g., 'clean-builder') from main.
3. In the worktree, create clean.ts with content: export const clean = true;
4. git add -A and git commit -m 'Clean feature'
5. Verify the worktree is clean: git status --porcelain should be empty

EXECUTION:
6. Call rebaseAndMerge([worktreePath], mainRepoPath, 'main')

EXPECTED RESULTS:
- result.success === true
- result.mergedBranches.length === 1
- result.failedBranches.length === 0
- clean.ts exists on main after merge

ALSO VERIFY (if calling sanitizeWorktree directly):
- sanitizeWorktree result.committed === false (no extra commit needed)
- sanitizeWorktree result.removedProtectedFiles.length === 0
- sanitizeWorktree result.removedNodeModules === false

PASS CRITERIA:
- The sanitization step is a no-op for already-clean worktrees
- No unnecessary commits created
- The rebase-merge proceeds identically to a non-sanitized path