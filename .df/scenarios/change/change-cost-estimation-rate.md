---
name: change-cost-estimation-rate
type: change
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

MODIFICATION: Change the default cost estimation rate from 0.05 USD/min to 0.08 USD/min for all agent types. AFFECTED AREAS: src/utils/agent-enrichment.ts (DEFAULT_COST_RATE_PER_MIN constant), and any callers that pass a custom rate. EXPECTED EFFORT: Single constant change in one file. No API contract changes needed since the rate is an internal implementation detail. All existing tests should pass after update with adjusted expected values. PASS CRITERIA: Change requires modifying exactly 1 constant in 1 file. All cost estimates increase proportionally (8/5 ratio). No changes needed in server.ts or dashboard/index.ts.