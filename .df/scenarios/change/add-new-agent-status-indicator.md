---
name: add-new-agent-status-indicator
type: change
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

MODIFICATION: Add an animated indicator for a new hypothetical agent status type.

DESCRIPTION:
If a new agent status (e.g., 'waiting' or 'retrying') were added that should show its own animated indicator, it should be easy to add.

EXPECTED EFFORT:
- Should require changes to only 1-2 files
- CSS: Add a new .status-badge style and/or animation for the new status in generateStyles()
- JS: Add the new status to the condition that checks for active statuses in renderAgents()
- Estimated: 3-10 lines of changes

AFFECTED AREAS:
- src/dashboard/index.ts — generateStyles() for CSS, generateScript() for JS status check
- src/types/agent.ts — if the new status needs to be added to the AgentStatus type

PASS CRITERIA:
- The active agent indicator logic uses a list/set of active statuses that is easy to extend
- Adding a status to the list automatically gets the animation treatment
- CSS is organized so adding a new .status-badge variant is straightforward