---
name: standalone-builds-still-work
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Standalone Builds Still Work

## Preconditions
- Workspace with frontend/ and backend/ member projects
- backend/ has its own .df/ directory from dark init
- backend/ has at least one spec in backend/.df/specs/

## Steps
1. cd backend/
2. Run: dark build <spec-id> (a backend-only spec)
3. Observe that the build uses backend/.df/ NOT .df-workspace/

## Expected Output
1. The build runs entirely within backend/.df/
2. backend/.df/state.db is updated with the run
3. .df-workspace/state.db is NOT modified
4. Builders get worktrees from backend/.git
5. The pipeline completes normally as it would without any workspace
6. dark status from backend/ shows the run correctly

## Pass Criteria
- findDfDir() resolves to backend/.df/ when cwd is backend/
- No workspace-level state is touched
- Build pipeline phases execute normally (scout, architect, build, evaluate, merge)
- Existing dark init + dark build workflow is completely unaffected
- No new CLI flags or options are required for standalone builds