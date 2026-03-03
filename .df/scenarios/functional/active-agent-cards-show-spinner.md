---
name: active-agent-cards-show-spinner
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

SCENARIO: Active (running/spawning) agent cards display animated loading spinners.

PRECONDITIONS:
- A run 'run_test2' exists with status 'running', current_phase 'build'
- Three agents exist for this run:
  - agent_a: role='builder', status='running', name='builder-1', cost_usd=0, created_at=3 minutes ago
  - agent_b: role='builder', status='completed', name='builder-2', cost_usd=0.12, created_at=10 minutes ago
  - agent_c: role='architect', status='spawning', name='architect-1', cost_usd=0, created_at=30 seconds ago

STEPS:
1. Start dashboard server on test port
2. GET /api/runs/run_test2/agents
3. Inspect the dashboard HTML source for agent rendering code

EXPECTED RESULTS:
- The agents API returns all 3 agents with correct status fields
- In the dashboard HTML/JS:
  - Agent cards for 'running' agents (agent_a) include an animated spinner element or a loading animation CSS class (e.g., 'agent-loading' or enhanced 'agent-status-indicator.running' with a spinner overlay)
  - Agent cards for 'spawning' agents (agent_c) include a distinct animated indicator showing the agent is being initialized
  - Agent cards for 'completed' agents (agent_b) show NO spinner/loading animation - just a static completed indicator
  - The spinner animation is defined in CSS (not requiring external assets)
  - The spinner is visible near the agent name or status badge area

PASS CRITERIA:
- The renderAgents function in the dashboard JavaScript produces HTML with an animated indicator for status 'running' and 'spawning'
- CSS defines at minimum a @keyframes animation used by the agent loading indicator
- The loading indicator is visually distinct from the existing small 8px status dot (larger, more prominent, or includes a rotating element)