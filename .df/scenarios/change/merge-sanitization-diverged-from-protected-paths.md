---
name: merge-sanitization-diverged-from-protected-paths
type: change
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJT3FJ5RPKEH10EDA42DS0H9
---

CHANGEABILITY SCENARIO: merge-sanitization.ts defines FORBIDDEN_MERGE_PATTERNS with only 3 entries (.df/state.db, .claude/, .letta/) while protected-paths.ts defines PROTECTED_PATTERNS with 12 entries (including .df/worktrees/, .df/logs/, node_modules/, dist/, build/, .env, .env.local). If sanitizedMerge() is ever called, it would NOT filter out 9 patterns that protected-paths.ts considers protected. The lists have diverged. VERIFICATION: 1. Read merge-sanitization.ts FORBIDDEN_MERGE_PATTERNS — 3 entries. 2. Read protected-paths.ts PROTECTED_PATTERNS — 12 entries. 3. merge-sanitization.ts does NOT import from protected-paths.ts. PASS CRITERIA: PASS if merge-sanitization.ts imports and uses PROTECTED_PATTERNS from protected-paths.ts (or is deleted). FAIL if it maintains a separate subset list.