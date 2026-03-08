---
name: cost-rate-0.05-in-five-independent-files
type: change
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6FRE2SYYF08YWK5EWPH8JZ
---

CHANGE SCENARIO: Cost rate 0.05 appears in FIVE independent files, not 3 or 4 as previously estimated. Locations: (1) src/utils/agent-enrichment.ts:4 DEFAULT_COST_RATE_PER_MIN=0.05, (2) src/pipeline/budget.ts:41 DEFAULT_COST_PER_MINUTE=0.05, (3) src/utils/cost.ts:15 Sonnet profile cost_per_minute:0.05, (4) src/types/config.ts:38 DEFAULT_COST_CONFIG.cost_per_minute=0.05, (5) src/types/config.ts:87 DEFAULT_CONFIG.build.cost_per_minute=0.05. None import from a shared source. Changing the default rate requires editing all 5. VERIFICATION: grep '= 0.05' across src/ and count unique files. PASS: All 5 locations import from a single shared constant. FAIL: 2+ files define 0.05 independently.