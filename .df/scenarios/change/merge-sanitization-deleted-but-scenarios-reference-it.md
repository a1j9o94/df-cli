---
name: merge-sanitization-deleted-but-scenarios-reference-it
type: change
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7M1CWFVCEJ0GX143ASJYM3
---

Multiple scenarios reference src/pipeline/merge-sanitization.ts and its FORBIDDEN_MERGE_PATTERNS, but this file has been DELETED from the codebase. Scenarios claiming merge-sanitization diverged from protected-paths, has separate patterns, imports protected paths, or is dead code are ALL stale. PASS if no scenarios reference deleted merge-sanitization.ts. FAIL if scenarios reference nonexistent files.