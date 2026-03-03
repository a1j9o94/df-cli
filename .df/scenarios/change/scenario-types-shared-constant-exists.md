---
name: scenario-types-shared-constant-exists
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify a shared SCENARIO_TYPES constant exists (e.g., in types/ or a constants file) and is imported by all files that reference scenario type strings. PASS if grep for SCENARIO_TYPES finds imports in scenario/create.ts, scenario/list.ts, agent/complete.ts, instruction-context.ts. FAIL if the strings 'functional' and 'change' are hardcoded independently in 3+ files without a shared constant.