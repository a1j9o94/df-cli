---
name: phase-indicator-different-keyframes-per-type
type: change
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJS1H35CGTM3ZRT2YN5H2FZN
---

MODIFICATION: Each animated indicator type should have its own @keyframes definition to allow independent customization.

DESCRIPTION:
Currently .auto-refresh-indicator, .agent-status-indicator.running/.spawning, and .phase-indicator.active all share @keyframes pulse. Changing the pulse animation affects all three.

EXPECTED EFFORT:
- Create @keyframes agent-pulse, @keyframes phase-pulse, @keyframes refresh-pulse
- Update each CSS rule to reference its own keyframes
- 15-25 lines of CSS changes in generateStyles()
- No JS changes

PASS CRITERIA:
- Each indicator type uses its own @keyframes definition
- Changing one animation does not affect others
- All animations still work correctly after separation