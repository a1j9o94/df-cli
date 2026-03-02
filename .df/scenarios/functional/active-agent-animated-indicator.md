---
name: active-agent-animated-indicator
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Agents with active status show animated indicators.

PRECONDITIONS:
- Dashboard server running with seeded data
- At least one agent has status 'running' or 'spawning' in the database

STEPS:
1. Open dashboard and select a run that has agents with status 'running' or 'spawning'
2. View the Agents tab

EXPECTED:
- Agent cards for agents with status 'running' should display an animated visual indicator (e.g., spinning icon, pulsing dot, animated border) distinct from static status badges
- Agent cards for agents with status 'spawning' should also display an animated indicator
- Agents with terminal statuses ('completed', 'failed', 'killed') should NOT have animated indicators
- The animated indicator must use CSS animation (@keyframes) — not just a static icon

VERIFICATION:
- The generated HTML/JS should contain rendering logic that checks agent status and adds an animated CSS class or element for 'running'/'spawning' agents
- Test: In the renderAgents() JS function, agents with status 'running' or 'spawning' get a CSS class that has an associated @keyframes animation
- Test: The CSS in generateStyles() contains animation definitions for active agent indicators
- Grep check: The word 'running' or active status check appears in agent rendering code with corresponding animation class