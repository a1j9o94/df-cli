---
name: change-cost-rate
type: change
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRJ1FTAH2THWVNMC3T1NGRB
---

Modification: Change the cost estimation rate from $0.05/min to $0.10/min for builder agents and $0.08/min for other roles. Affected areas: src/utils/agent-enrichment.ts (estimateCost function and DEFAULT_COST_RATE_PER_MIN constant). Expected effort: Small — change one constant or add a role-based lookup table. No other files should need changes since the estimateCost function is the single source of truth for rate. Verification: After change, a running builder agent with 5 minutes elapsed should show ~$0.50 estimated cost instead of ~$0.25.