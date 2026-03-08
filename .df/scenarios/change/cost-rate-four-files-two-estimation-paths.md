---
name: cost-rate-four-files-two-estimation-paths
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7T4F32F6SA6R6BNRB2HGS2
---

CHANGEABILITY SCENARIO: Cost rate 0.05 is defined independently in 4 files (config.ts lines 38+87, cost.ts line 15, budget.ts line 41, agent-enrichment.ts line 4) with TWO separate estimation code paths: (1) budget.ts estimateAndRecordCost for recorded costs via command layer, (2) agent-enrichment.ts estimateCost for dashboard live display. Changing the rate requires editing all 4 files. Changing the estimation formula requires editing 2 files. PASS if rate is defined in exactly 1 file and imported by all consumers. FAIL if rate appears as a literal in 2+ independent files.