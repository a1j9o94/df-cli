---
name: global-dashboard-shows-all-projects
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Global Dashboard Shows All Projects

### Preconditions
- Multiple projects registered in ~/.dark/registry.yaml (at least 2 standalone projects and 1 workspace)
- At least one project has a completed run with known status

### Steps
1. cd ~ (or any directory without .df/ or .df-workspace/)
2. Run dark dash
3. Open the dashboard URL in a browser

### Expected Output
- Dashboard renders a grid of all registered projects and workspaces
- Each entry shows: name, path, last run status, last run date
- Aggregate stats shown: total runs, total cost, active agents
- Clicking a project navigates to /project/<name> showing project-level view
- Clicking a workspace navigates to /workspace/<name> showing workspace view

### Pass/Fail
- PASS: All registered projects visible with correct status, drill-down navigation works
- FAIL: Projects missing, no aggregate stats, or navigation broken