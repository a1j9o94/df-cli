---
name: add-new-protected-pattern
type: change
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJR7MBQH86Y3MMHWHQY1KCZS
---

CHANGEABILITY SCENARIO: Adding a new protected pattern should be automatically honored by both worktree sanitization and merge sanitization with no code changes beyond protected-paths.ts.

MODIFICATION:
1. Add a new pattern '.secrets/' to PROTECTED_PATTERNS in src/runtime/protected-paths.ts
2. No other code changes needed

VERIFICATION:
1. Create a worktree with a .secrets/api-key.txt file committed
2. Run sanitizeWorktree() on it
3. The .secrets/api-key.txt should be removed from git tracking
4. The file should not appear in main after rebaseAndMerge()

AFFECTED AREAS:
- src/runtime/protected-paths.ts (single-line addition to PROTECTED_PATTERNS array)
- Worktree .gitignore generation (automatic via generateWorktreeGitignore)
- Worktree pre-rebase sanitization (automatic via isProtectedPath)
- Post-merge sanitization in rebase-merge.ts (automatic via getProtectedFiles)

EXPECTED EFFORT:
- 1 line of code changed
- 0 files structurally modified beyond protected-paths.ts
- All sanitization functions should automatically respect the new pattern because they call isProtectedPath() or getProtectedFiles() from the single source of truth

PASS CRITERIA:
- The new pattern is honored without touching worktree-sanitization.ts, rebase-merge.ts, or merge-sanitization.ts
- The single-source-of-truth contract (ProtectedPathsAPI) is maintained