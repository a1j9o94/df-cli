---
name: module-filter-returns-latest-attempt-only
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFKPJ8HEY7A266WA4QRV46A
---

SCENARIO: dark agent list --module <id> shows only the latest attempt for that module, not all historical attempts.

SETUP:
1. Create test DB, run
2. Create 3 agents for module 'parser': attempt1 (failed), attempt2 (failed), attempt3 (running)
3. Total agents with module_id='parser': 3

VERIFICATION:
- Call dark agent list --module parser
- Result should show only 1 agent: attempt3 (the latest/most recent by rowid)
- NOT all 3 attempts

CODE CHECK:
- listAgentsFiltered with moduleId option should deduplicate to latest attempt
- Or the list command should apply getLatestAgentPerModule after module filtering

PASS CRITERIA:
- --module filter returns only the latest agent for that module
- Previous failed/completed attempts are not shown
- If latest attempt is running, only that one appears
- Count of returned agents = 1 for a single module

FAIL CRITERIA:
- --module filter returns all 3 attempts
- Just filters by module_id = ? without deduplication