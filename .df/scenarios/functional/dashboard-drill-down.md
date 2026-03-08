---
name: dashboard-drill-down
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Dashboard Drill-down Navigation

### Preconditions
- Workspace with frontend/ and backend/ member projects
- At least one run exists at workspace level and at project level

### Steps
1. Start dark dash from workspace root
2. Verify workspace-level dashboard renders at /
3. Click into 'backend' member project
4. Verify URL changes to /project/backend
5. Verify project-level view shows: runs, agents, phases, buildplan, scenarios, cost
6. Click back/navigate to workspace level
7. Verify URL returns to / and workspace view renders

### Expected Output
- Workspace view at / shows member project grid
- /project/backend shows project-level detail view
- Navigation between levels works without page reload issues
- Each level shows appropriate data from correct DB (workspace vs project)

### Pass/Fail
- PASS: Drill-down and back navigation work, correct data shown at each level
- FAIL: Navigation broken, wrong data shown, or 404 errors on level change