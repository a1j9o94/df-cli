---
name: estimateCostIfMissing-does-not-exist
type: change
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK77KMRRRHNXJW1T7AHKMGEP
---

Verify estimateCostIfMissing function does NOT exist anywhere in the codebase. The actual function is estimateAndRecordCost in src/pipeline/budget.ts, exported as a standalone function. PASS: grep for estimateCostIfMissing returns zero matches in src/. FAIL: function exists somewhere.