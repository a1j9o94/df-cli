---
name: agent-list-elapsed-and-cost
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: Agent list shows elapsed time and estimated cost for running agents.

PRECONDITIONS:
- A run exists with at least one agent in 'running' status that was created >30 seconds ago.
- At least one agent has cost_usd > 0.

STEPS:
1. Run: dark agent list --run-id <run_id>
2. Capture the text output.

EXPECTED OUTPUT:
- Each running agent line contains an elapsed time in format like '12m 34s' or '5s' (matches pattern /\d+[hms]/).
- Each agent with cost_usd > 0 shows cost prefixed with '~$' (matches pattern /~?\$\d+\.\d{2}/).
- The elapsed time for a running agent is greater than 0s.
- Completed agents show their final elapsed time (from total_active_ms) rather than live-computed.

PASS CRITERIA:
- Running agent output matches: /<agent_id>\s+\S+\s+\(\w+\)\s+running\s+\d+[hms].*~?\$\d+\.\d{2}/
- No running agent shows '0s' elapsed.
- Elapsed is shown BEFORE cost on the same line.