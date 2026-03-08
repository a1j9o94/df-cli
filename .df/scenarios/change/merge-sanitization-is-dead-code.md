---
name: merge-sanitization-is-dead-code
type: change
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6V31S8AAGMYDQV0RA43AWE
---

CHANGE SCENARIO: Verify merge-sanitization.ts is dead code

DESCRIPTION: src/pipeline/merge-sanitization.ts defines sanitizedMerge() and FORBIDDEN_MERGE_PATTERNS, but the actual active merge path uses src/pipeline/rebase-merge.ts which imports from src/runtime/protected-paths.ts. sanitizedMerge() is never imported or called by any file.

VERIFICATION:
1. grep -r 'sanitizedMerge' src/ should only find the definition in merge-sanitization.ts
2. grep -r 'merge-sanitization' src/ should find no imports
3. src/pipeline/rebase-merge.ts imports getProtectedFiles from protected-paths.ts (active path)
4. src/pipeline/merge-phase.ts calls mergeSingleBranch from rebase-merge.ts (active path)

PASS CRITERIA:
- sanitizedMerge is either removed or wired into the active merge pipeline
- FORBIDDEN_MERGE_PATTERNS is removed (replaced by PROTECTED_PATTERNS from protected-paths.ts)

FAIL CRITERIA:
- sanitizedMerge exists but is never called (dead code)
- FORBIDDEN_MERGE_PATTERNS duplicates a subset of PROTECTED_PATTERNS