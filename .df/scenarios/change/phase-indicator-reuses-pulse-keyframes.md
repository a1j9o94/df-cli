---
name: phase-indicator-reuses-pulse-keyframes
type: change
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRK1X97M7RDEHWP0HXZKAT1
---

MODIFICATION: The phase indicator and agent status indicators both use the same @keyframes pulse animation as the auto-refresh indicator.

DESCRIPTION:
Currently three different visual indicators all share the same @keyframes pulse:
1. .auto-refresh-indicator (header green dot)
2. .agent-status-indicator.running / .spawning
3. .phase-indicator.active

If someone wants to change the pulse animation for one of these without affecting the others, they would need to create separate keyframe definitions.

EXPECTED EFFORT:
- Should require creating separate @keyframes per animation type (e.g., @keyframes agent-pulse, @keyframes phase-pulse)
- Estimated: 10-20 lines of CSS changes in generateStyles()
- No JS changes needed

PASS CRITERIA:
- Each animated indicator type has its own @keyframes definition
- Changing one animation does not inadvertently affect others
- OR: If sharing a keyframe is intentional, each usage specifies its own timing/easing so they can be differentiated