---
name: cross-repo-spec-build
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Cross-repo Spec Build

### Preconditions
- Workspace initialized with frontend/ and backend/ projects
- Each project has .df/ initialized independently
- A workspace-level spec exists at .df-workspace/specs/ that describes:
  - Backend: Add GET /api/items endpoint
  - Frontend: Add ItemList component that calls GET /api/items

### Steps
1. Run dark build <workspace-spec-id> from workspace root
2. Wait for architect phase to complete
3. Inspect the generated buildplan JSON

### Expected Output
- Buildplan contains modules with targetProject field
- At least one module has targetProject: 'backend'
- At least one module has targetProject: 'frontend'
- Backend builders get worktrees created inside backend/ repo (not frontend/)
- Frontend builders get worktrees created inside frontend/ repo (not backend/)
- Contracts between modules can span projects (e.g., API contract binding backend implementer and frontend consumer)

### Pass/Fail
- PASS: Buildplan has correct targetProject tags, worktrees are in correct repos, cross-project contracts exist
- FAIL: Any module lacks targetProject, worktrees created in wrong repo, or contracts dont span projects