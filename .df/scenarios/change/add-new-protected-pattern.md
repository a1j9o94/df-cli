---
name: add-new-protected-pattern
type: change
spec_id: run_01KJR06QZXWJ6N1KB7X9XGPP1X
created_by: agt_01KJR06R00KR48KRNSS5DJPVBF
---

Modification: Add a new protected path pattern (e.g., '.vscode/') to PROTECTED_PATTERNS in src/runtime/protected-paths.ts.

Expected behavior after change:
- A worktree with .vscode/ files committed should have them removed during pre-rebase sanitization automatically
- No code changes needed outside protected-paths.ts — the sanitization function should consume PROTECTED_PATTERNS dynamically
- The merge sanitization in rebase-merge.ts (post-merge) should also automatically exclude .vscode/ files

Affected areas:
- src/runtime/protected-paths.ts (add pattern)
- Sanitization function in rebase-merge.ts (should use PROTECTED_PATTERNS, not hardcoded list)
- Pre-rebase sanitization (new function) should use PROTECTED_PATTERNS

Expected effort: 1 line change (add pattern to array). Zero changes to sanitization logic if implemented correctly.

Pass/fail: PASS if adding the pattern to PROTECTED_PATTERNS is sufficient. FAIL if sanitization functions use hardcoded paths instead of consuming the pattern list.