---
name: workspace-project-routing
type: functional
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Test: Workspace projects are accessible via dark.localhost/project paths.

Setup:
1. Portless is installed and active
2. A workspace exists with projects named 'frontend' and 'backend'
3. Dashboard is running with portless domain mapping active

Steps:
1. Start dark dash in a workspace with multiple projects
2. Navigate to http://dark.localhost/frontend
3. Navigate to http://dark.localhost/backend

Expected:
- http://dark.localhost shows the main dashboard
- http://dark.localhost/frontend routes to the frontend project view in the dashboard
- http://dark.localhost/backend routes to the backend project view in the dashboard
- Both project views load correctly with project-specific data

Pass criteria:
- Main dashboard accessible at dark.localhost
- Project-specific views accessible at dark.localhost/{project-name}
- Correct project data shown for each route