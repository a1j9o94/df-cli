---
name: cost-rate-import-chain-verification
type: change
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7NM79WZPQ5S2BK6HWS8SYQ
---

Verify cost rate 0.05 has NO import chain between its 4 definition sites. Run: grep -rn 'import.*agent-enrichment\|import.*budget\|import.*cost' src/types/config.ts src/pipeline/budget.ts src/utils/agent-enrichment.ts src/utils/cost.ts. PASS: zero cross-imports of the rate constant between these 4 files. FAIL: any file imports rate from another.