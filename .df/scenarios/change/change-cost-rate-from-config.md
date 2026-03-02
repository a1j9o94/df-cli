---
name: change-cost-rate-from-config
type: change
spec_id: run_01KJNFM665ED5QTN7XWE9CWAX8
created_by: agt_01KJNFM6666VCRQEE42RDZ9GJT
---

CHANGE SCENARIO: The hardcoded $0.05/min cost rate needs to become configurable per-model (e.g., Sonnet=$0.05/min, Opus=$0.15/min, Haiku=$0.01/min).

MODIFICATION DESCRIPTION:
Replace the hardcoded 0.05 rate in the server-side cost estimation with a lookup from a config object or the agent's metadata (model field).

AFFECTED AREAS:
1. Server-side cost estimation logic in src/dashboard/server.ts — the function computing estimatedCost
2. Any constant or config that holds the rate (should be a single place to change)
3. Possibly the AgentSummary interface if model info needs to be included

EXPECTED EFFORT:
- If the rate is defined as a named constant at the top of the file: ~5 min change (replace constant with lookup)
- If the rate is buried in a computation: ~15 min change (extract, parameterize)
- If there's no model field on agents: ~30 min change (need to add model tracking first)

EVALUATION CRITERIA:
- The rate should be defined in exactly ONE place (DRY)
- Changing the rate should not require modifying computation logic
- The rate should be accessible for testing (injectable or configurable)
- Ideally reuses the same rate constant that exists in src/pipeline/engine.ts line 756