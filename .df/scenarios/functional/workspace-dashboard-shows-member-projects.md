---
name: workspace-dashboard-shows-member-projects
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Workspace Dashboard Shows Member Projects

## Preconditions
- Workspace at /tmp/test-ws/ with .df-workspace/ containing:
  - config.yaml listing frontend and backend projects
  - state.db with at least one workspace-level run
- Both frontend/ and backend/ have .df/ with their own runs
- A shared contract exists between the projects

## Steps
1. cd /tmp/test-ws/ (workspace root)
2. Run: dark dash
3. Open dashboard URL
4. Observe workspace-level view

## Expected Output
1. Dashboard detects .df-workspace/ and renders workspace-level view
2. Member projects shown in a grid:
   - frontend: name, last run status, last run date
   - backend: name, last run status, last run date
3. Workspace-level runs shown with:
   - Which projects are involved in each run
   - Cross-repo spec references
4. Shared contract status section:
   - Lists contracts spanning projects
   - Shows satisfied vs pending status
5. Dependency graph visualization shows which projects depend on which
6. Click on a member project navigates to /project/frontend or /project/backend
7. Project-level view shows that project's runs, agents, phases

## Pass Criteria
- Workspace detection works (findWorkspaceDir returns .df-workspace/)
- All member projects listed with correct status
- Workspace-level runs display correctly
- Navigation to member project views works
- No errors when a member project has no runs