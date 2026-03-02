---
name: merge-sanitization-has-separate-patterns-list
type: change
spec_id: run_01KJR7MBQFPM5ZN5Z78QJSBMQ9
created_by: agt_01KJRA7TBXR385HPD7TGX2BV3E
---

CHANGEABILITY SCENARIO: merge-sanitization.ts contains its own FORBIDDEN_MERGE_PATTERNS list (only .df/state.db, .claude/, .letta/) that is a separate, smaller list than PROTECTED_PATTERNS in protected-paths.ts. If sanitizedMerge() is ever called instead of rebaseAndMerge(), newly added patterns to PROTECTED_PATTERNS would not be honored.

CURRENT STATE:
- merge-sanitization.ts exports sanitizedMerge() with FORBIDDEN_MERGE_PATTERNS
- This function is NOT currently imported by any active code path
- But it exists as a public export that could be used in the future

VERIFICATION:
1. Add a new pattern to PROTECTED_PATTERNS (e.g., '.secrets/')
2. Create a worktree with .secrets/api-key.txt
3. Call sanitizedMerge() directly
4. .secrets/api-key.txt will NOT be filtered because FORBIDDEN_MERGE_PATTERNS doesn't include it

EXPECTED FIX:
- Either delete merge-sanitization.ts (since it's unused)
- Or refactor it to use PROTECTED_PATTERNS from protected-paths.ts
- Or add a comment warning that it's a separate, subset list

PASS CRITERIA:
- merge-sanitization.ts should either use the single source of truth or be removed