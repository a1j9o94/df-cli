---
name: global-dashboard-shows-all-projects
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Global Dashboard Shows All Projects

## Preconditions
- ~/.dark/registry.yaml exists with at least 3 entries:
  - project-a: /path/to/project-a, type: project
  - project-b: /path/to/project-b, type: project
  - my-workspace: /path/to/workspace, type: workspace
- At least one project has a completed run, one has a failed run
- dark dash is NOT invoked from within any .df/ or .df-workspace/ directory

## Steps
1. cd ~ (or any directory without .df/ or .df-workspace/)
2. Run: dark dash
3. Open the dashboard URL in browser
4. Observe the global view

## Expected Output
1. Dashboard loads at the global level (not project or workspace level)
2. Dashboard shows a grid/list of all registered projects and workspaces
3. Each entry shows:
   - Project/workspace name
   - Path on disk
   - Type (project vs workspace)
   - Last run status (completed, failed, etc.)
   - Last run date
4. Aggregate stats are shown: total runs, total cost, active agents across all projects
5. Clicking a project navigates to /project/<name> and shows project-level dashboard
6. Clicking a workspace navigates to /workspace/<name> and shows workspace-level dashboard

## Pass Criteria
- Dashboard renders without errors when no .df/ or .df-workspace/ exists
- All registry entries are displayed
- Navigation to project/workspace views works
- API route GET /api/registry returns all registered entries