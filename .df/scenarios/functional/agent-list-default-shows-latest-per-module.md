---
name: agent-list-default-shows-latest-per-module
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFKPJ8HEY7A266WA4QRV46A
---

SCENARIO: dark agent list (no flags) defaults to showing latest agent per module for the most recent run, not ALL agents from ALL runs.

SETUP:
1. Create test DB with getDbForTest()
2. Create run1 with 2 builder agents for modules foo and bar
3. Create run2 (latest) with 3 agents: 2 attempts for module foo (retry), 1 for module bar
4. Total agents in DB: 5

VERIFICATION:
- Call dark agent list (no flags) OR list.ts command action with empty options
- Result should show only 2 agents (latest per module from latest run): b-foo-attempt2, b-bar
- NOT all 5 agents from both runs

CODE CHECK:
- src/commands/agent/list.ts must use getLatestAgentPerModule() as default when no run-id is specified
- getLatestAgentPerModule is defined in agent-queries.ts but MUST be wired into the list command
- When --run-id is explicitly provided, use that run; otherwise auto-detect latest run

PASS CRITERIA:
- Default listing (no flags) shows only latest agent per module from most recent run
- Old run agents are not shown
- Retry attempts within same run are deduplicated to latest only
- getLatestAgentPerModule is called in list.ts when no explicit run-id given

FAIL CRITERIA:
- Default listing returns ALL agents from ALL runs
- listAgentsFiltered called with empty {} returns everything
- getLatestAgentPerModule exists but is never imported/used in list.ts