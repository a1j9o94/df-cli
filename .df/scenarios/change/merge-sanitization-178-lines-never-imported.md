---
name: merge-sanitization-178-lines-never-imported
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7T4F32F6SA6R6BNRB2HGS2
---

CHANGEABILITY SCENARIO: merge-sanitization.ts is 178 lines of dead code. VERIFICATION: grep -r 'merge-sanitization' src/ returns zero import statements outside the file itself. The module exports sanitizedMerge() and FORBIDDEN_MERGE_PATTERNS but nothing imports them. The active merge path uses rebase-merge.ts which imports PROTECTED_PATTERNS from protected-paths.ts. EXPECTED: File should be deleted or integrated. PASS if merge-sanitization.ts is either deleted or imported by at least one other module. FAIL if it exists but has zero importers.