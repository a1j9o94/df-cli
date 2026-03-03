---
name: cost-rate-used-from-cost-config-not-hardcoded
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify that all cost estimation consumers (budget.ts, agent-enrichment.ts, server.ts) import their rate from a single CostConfig source (types/config.ts or utils/cost.ts), NOT from independent hardcoded 0.05 constants. PASS if grep for '= 0.05' finds exactly 1 definition in config, and all others import it. FAIL if multiple independent constants define the same value.