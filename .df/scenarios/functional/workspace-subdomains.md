---
name: workspace-subdomains
type: functional
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Preconditions: portless is installed, workspace has projects named 'frontend' and 'backend'. Steps: 1. Run 'dark dash' in a workspace context with multiple projects. 2. Verify dark.localhost loads the main dashboard. 3. Verify dark.localhost/frontend routes to the frontend project view. 4. Verify dark.localhost/backend routes to the backend project view. 5. Verify navigation between project views works. Pass criteria: Project-specific URLs resolve to correct project views within the dashboard.