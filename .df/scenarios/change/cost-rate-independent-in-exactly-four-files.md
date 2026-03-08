---
name: cost-rate-independent-in-exactly-four-files
type: change
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK77KMRRRHNXJW1T7AHKMGEP
---

Verify 0.05 cost rate appears in exactly 4 files (agent-enrichment.ts, budget.ts, cost.ts, config.ts) with 5 total occurrences (config.ts has 2). None import the rate from a shared source. PASS: grep for 0.05 in src/ finds exactly these 4 files with independent definitions. FAIL: different count or shared import exists.