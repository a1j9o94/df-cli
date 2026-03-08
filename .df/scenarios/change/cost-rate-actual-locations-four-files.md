---
name: cost-rate-actual-locations-four-files
type: change
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK7017ASDX9EKP96GZTBSZA8
---

VERIFIED FACT: 0.05 cost rate is defined independently in exactly 4 files (5 occurrences): (1) src/utils/agent-enrichment.ts:4 DEFAULT_COST_RATE_PER_MIN=0.05, (2) src/pipeline/budget.ts:41 DEFAULT_COST_PER_MINUTE=0.05, (3) src/utils/cost.ts:15 cost_per_minute:0.05 in sonnet profile, (4) src/types/config.ts:38 DEFAULT_COST_CONFIG.cost_per_minute:0.05, (5) src/types/config.ts:87 DEFAULT_CONFIG.build.cost_per_minute:0.05. NONE import from each other. 0.05 does NOT appear in build-phase.ts, agent-lifecycle.ts, or engine.ts. estimateCostIfMissing does NOT exist. estimateAndRecordCost is in budget.ts as standalone export. PASS: changing rate requires editing 4 files. FAIL: any scenario claiming single source of truth or citing build-phase.ts/agent-lifecycle.ts/engine.ts.