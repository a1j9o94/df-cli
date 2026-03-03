---
name: merge-sanitization-imports-protected-patterns
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify merge-sanitization.ts imports and uses PROTECTED_PATTERNS from runtime/protected-paths.ts instead of maintaining its own FORBIDDEN_MERGE_PATTERNS list. PASS if merge-sanitization.ts has import from protected-paths.ts and no local pattern list. FAIL if merge-sanitization.ts defines its own pattern list.