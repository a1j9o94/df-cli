---
name: cost-rate-tripled-across-config-budget-enrichment
type: change
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJT3FHY2TEZNJCJVRPW3W1QS
---

CHANGEABILITY SCENARIO: Cost rate 0.05 is defined as named constants in THREE separate files: src/types/config.ts (DEFAULT_COST_CONFIG.cost_per_minute=0.05 and build.cost_per_minute=0.05), src/pipeline/budget.ts (DEFAULT_COST_PER_MINUTE=0.05), and src/utils/agent-enrichment.ts (DEFAULT_COST_RATE_PER_MIN=0.05). Changing the default rate requires updating all 3. VERIFICATION: grep -rn '0.05' src/ | grep -v node_modules shows 3+ files. PASS CRITERIA: PASS if a single DEFAULT_COST_PER_MINUTE is exported from one file and imported by all others. FAIL if the constant is defined independently in 3+ files.