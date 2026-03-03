---
name: protected-paths-not-single-source-of-truth
type: change
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRVEYFDXJNJKNTH0MA6VNV3
---

SCENARIO: protected-paths.ts defines PROTECTED_PATTERNS but merge-sanitization.ts defines its own FORBIDDEN_MERGE_PATTERNS with a different subset. Adding a new protected path requires changes in 2 files. PASS: merge-sanitization.ts imports patterns from protected-paths.ts. FAIL: Two separate pattern lists exist. Current state: FAIL.