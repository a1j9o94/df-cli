---
name: dashboard-drill-down
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Dashboard Drill-Down Navigation

## Preconditions
- Workspace at /tmp/test-ws/ with frontend/ and backend/
- dark dash running from workspace root
- At least one run exists in backend/.df/state.db

## Steps
1. Open workspace dashboard at /
2. Click on backend project in the member projects grid
3. Observe navigation to /project/backend
4. Select a run in the project-level view
5. Click browser back or navigate to /
6. Observe return to workspace level

## Expected Output
1. URL changes to /project/backend on click
2. Project-level dashboard renders showing backend's runs, agents, phases
3. Run detail panel works: agents, modules, phases, buildplan, cost
4. Navigation back to / returns to workspace-level view
5. URL scheme: / = workspace, /project/<name> = project drill-down

## Pass Criteria
- URL routing works: / (workspace), /project/backend (project), /project/frontend (project)
- Project-level view reads from the correct state.db (backend/.df/state.db)
- All existing project-level features work within the drill-down (tabs, auto-refresh, etc.)
- No 404 errors on navigation
- Back navigation preserves workspace-level state