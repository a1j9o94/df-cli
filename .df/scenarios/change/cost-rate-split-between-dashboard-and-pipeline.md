---
name: cost-rate-split-between-dashboard-and-pipeline
type: change
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJT3FJ5RPKEH10EDA42DS0H9
---

CHANGEABILITY SCENARIO: The cost rate constant 0.05 USD/min is defined independently in TWO files with different names: agent-enrichment.ts exports DEFAULT_COST_RATE_PER_MIN and budget.ts defines DEFAULT_COST_PER_MINUTE. Changing the rate requires editing BOTH files. A developer might change one and miss the other, leading to inconsistent cost display (dashboard) vs cost recording (pipeline). VERIFICATION: 1. grep DEFAULT_COST.*PER_MIN src/utils/agent-enrichment.ts — finds DEFAULT_COST_RATE_PER_MIN=0.05. 2. grep DEFAULT_COST.*PER_MINUTE src/pipeline/budget.ts — finds DEFAULT_COST_PER_MINUTE=0.05. 3. These are independent constants with no shared import. PASS CRITERIA: PASS if a single constant is exported from one location and imported by both agent-enrichment.ts and budget.ts. FAIL if two separate constants define the same rate.