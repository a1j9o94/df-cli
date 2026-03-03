---
name: agent-list-filter-active
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: Agent list --active flag filters to only live agents.

PRECONDITIONS:
- A run exists with agents in mixed statuses: at least one 'running', at least one 'completed', and at least one 'failed' (from a previous retry attempt).
- There are multiple agents for the same module_id (retry scenario).

STEPS:
1. Run: dark agent list --active
2. Capture text output.
3. Run: dark agent list (without --active)
4. Capture text output.

EXPECTED OUTPUT (--active):
- ONLY agents with status pending, spawning, or running are shown.
- No agents with status completed, failed, or killed appear.
- Count of agents shown is less than total agents in DB.

EXPECTED OUTPUT (default, no flags):
- Shows latest agent per module (not ALL historical attempts).
- If module 'foo' has 2 agents (failed attempt + running retry), only the running one appears.
- Non-module agents (orchestrator, architect) show all.

PASS CRITERIA:
- With --active: grep for 'completed' or 'failed' in output returns no matches.
- With --active: all shown agents have status in {pending, spawning, running}.
- Default: number of agents shown <= number of distinct modules + non-module agents.
- Default: no duplicate module_ids in output.