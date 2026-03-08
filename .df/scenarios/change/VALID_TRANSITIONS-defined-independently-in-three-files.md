---
name: VALID_TRANSITIONS-defined-independently-in-three-files
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK7368XBFB069N1WH5008E65
---

VERIFIED FACT: VALID_TRANSITIONS is defined independently in 3 files: (1) src/pipeline/build-guards.ts, (2) src/db/queries/spec-lineage.ts, (3) src/db/queries/spec-transitions.ts. None import from each other. Adding a new status transition requires editing all 3 files. VERIFICATION: grep -rn 'VALID_TRANSITIONS' src/ shows 3 independent definitions. PASS CRITERIA: Single VALID_TRANSITIONS exported from one file, imported by others. FAIL CRITERIA: 3+ independent definitions.