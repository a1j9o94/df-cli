---
name: isProtectedPath-comment-claims-glob-but-uses-exact-match
type: functional
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJRA7TBXR385HPD7TGX2BV3E
---

SCENARIO: The isProtectedPath function comment at line 68-69 of protected-paths.ts claims 'Glob patterns with wildcard (e.g., state.db* behavior via prefix matching)' but the code at line 70 only does exact equality (normalized === pattern). This means an unexpected SQLite temp file like .df/state.db-tmpXXXXXX would NOT be matched.

SETUP:
1. Create a worktree with .df/state.db-tmp12345 committed (a hypothetical SQLite temp file)

EXECUTION:
2. Call sanitizeWorktree() on the worktree

EXPECTED:
- If comment is correct (prefix matching): .df/state.db-tmp12345 should be removed
- If code is correct (exact matching): .df/state.db-tmp12345 will NOT be removed

PASS CRITERIA:
- Either fix the comment to match the code, or fix the code to do prefix matching for .df/state.db patterns
- Currently the comment is misleading, creating a false sense of security