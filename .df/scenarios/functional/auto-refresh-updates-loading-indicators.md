---
name: auto-refresh-updates-loading-indicators
type: functional
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

SCENARIO: Auto-refresh cycle updates loading indicators without showing spinners on background refresh.

PRECONDITIONS:
- A run 'run_refresh_test' exists with status 'running', current_phase 'architect'
- One agent exists: role='architect', status='running'

STEPS:
1. Start dashboard server
2. Load dashboard HTML
3. Simulate initial run selection (first load shows spinners)
4. Examine the auto-refresh logic in the dashboard JavaScript

EXPECTED RESULTS:
- On initial run selection (selectRun function), loading spinners ARE shown for run detail, agents, and modules panels (showSpinner=true)
- On auto-refresh (refresh function), loading spinners are NOT shown (showSpinner=false) - existing data stays visible while fetching
- Phase timeline updates during refresh: if current_phase changes from 'architect' to 'build' between refreshes, the phase timeline updates to show 'build' as active
- Agent status indicators update during refresh: if an agent goes from 'running' to 'completed', its spinner stops and shows a static completed indicator
- The refresh interval remains 5000ms (REFRESH_INTERVAL constant)
- Phase data is fetched during the refresh cycle alongside run detail, agents, and modules

PASS CRITERIA:
- The refresh() function calls a loadPhases() or equivalent function alongside existing loadRunDetail/loadAgents/loadModules
- loadPhases passes showSpinner=false on auto-refresh, showSpinner=true on initial load
- No visual flicker: data is replaced in-place, not cleared and re-rendered