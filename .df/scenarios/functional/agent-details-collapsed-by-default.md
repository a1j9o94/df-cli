---
name: agent-details-collapsed-by-default
type: functional
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

SETUP: Start dashboard with a database containing a running run with at least 2 agents (architect + builder). STEPS: 1. GET / (HTML) and select the run. 2. The default tab should be 'Overview'. 3. On the Overview tab, verify agent details (PID, cost, tokens, worktree path) are NOT visible in the default view. 4. Find a collapsible 'Agents' section at the bottom of the Overview tab. 5. Verify it is collapsed by default (agent detail rows hidden). 6. Click to expand the agents section. 7. Verify expanded view shows: agent role, status, elapsed time, PID, cost, tokens, and error if present. PASS CRITERIA: - Agent details (PID, cost per agent, tokens per agent) NOT visible on initial Overview render - A collapsible agents section exists at the bottom of the overview - Expanding it reveals full agent details including PID, cost, tokens - Agents tab is NOT the default tab (Overview is default)