---
name: cost-rate-refactored-to-command-layer
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7XF6W0MA66MHHBCJ5JS3RM
---

VERIFIED FACT: Cost estimation was refactored from inline 0.05 magic numbers in build-phase.ts and agent-lifecycle.ts to the command layer using estimateAndRecordCost from budget.ts. Multiple stale scenarios claim 0.05 is in build-phase.ts and agent-lifecycle.ts - grep confirms it is NOT. Cost rate 0.05 is in 4 files: config.ts (lines 38,87), cost.ts (line 15), agent-enrichment.ts (line 4), budget.ts (line 41). None import from each other. VERIFICATION: grep '0.05' src/pipeline/build-phase.ts src/pipeline/agent-lifecycle.ts returns no matches. PASS if 0.05 does NOT appear in build-phase.ts or agent-lifecycle.ts. FAIL if it does.