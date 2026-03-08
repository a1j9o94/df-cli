---
name: workspace-dashboard-member-projects
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Workspace Dashboard Shows Member Projects

### Preconditions
- Workspace with frontend/ and backend/ projects
- At least one workspace-level run has been executed
- A shared contract exists between projects

### Steps
1. cd to workspace root (where .df-workspace/ exists)
2. Run dark dash
3. Open dashboard URL

### Expected Output
- Dashboard shows all member projects in a grid with individual run status
- Workspace-level runs shown with which projects are involved
- Shared contract status visible: which contracts satisfied, which pending
- Dependency graph visualization: which projects depend on which
- Click into any member project shows project-level view (runs, agents, phases)

### Pass/Fail
- PASS: Member projects grid, workspace runs, contract status, and dependency graph all render correctly
- FAIL: Any section missing, incorrect project status, or broken navigation