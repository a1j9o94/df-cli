---
name: cost-rate-changeability
type: change
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRD3EPWYQRTC4V0KTP000QN
---

CHANGE SCENARIO: Modify the cost estimation rate from $0.05/min to a configurable value

DESCRIPTION:
The hardcoded rate of $0.05/min should be changeable. This tests how easily the rate can be modified or made configurable.

MODIFICATION:
1. Change the cost rate from 0.05 to 0.10 per minute
2. Verify the estimated costs double for all running agents

AFFECTED AREAS:
- src/utils/agent-enrichment.ts (DEFAULT_COST_RATE_PER_MIN constant)
- src/dashboard/server.ts (where estimateCost is called — should pass rate or use default)
- Any tests that assert specific cost values

EXPECTED EFFORT:
- If the rate is passed as a parameter to estimateCost (which it already is as an optional param), changing the default is a 1-line change
- If the server hardcodes 0.05, it requires finding and updating the hardcoded value
- Ideal: single constant change propagates everywhere

PASS CRITERIA:
- Changing DEFAULT_COST_RATE_PER_MIN in agent-enrichment.ts (or equivalent) changes all estimated costs
- No other files need modification for a rate change (single point of configuration)
- The estimateCost function accepts a rate parameter for override flexibility