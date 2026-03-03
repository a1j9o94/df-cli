---
name: cross-repo-spec-build
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Cross-repo Spec Build

## Preconditions
- Workspace initialized at /tmp/test-ws/ with frontend/ and backend/ as member projects
- Both frontend/ and backend/ have dark init run (each has .df/)
- A workspace-level spec exists at .df-workspace/specs/ that describes:
  - Adding a GET /api/users endpoint in backend
  - Adding a UsersPage component in frontend that calls /api/users

## Steps
1. Create a workspace spec referencing both projects
2. Run: dark build <spec-id> from workspace root
3. Observe the architect decomposition
4. Observe builder worktree creation

## Expected Output
1. Architect agent receives context from BOTH frontend/ and backend/ codebases
2. Architect produces a buildplan where modules have targetProject field:
   - At least one module has targetProject: 'backend'
   - At least one module has targetProject: 'frontend'
3. Builder for backend module gets a worktree created from backend/.git (not frontend/.git)
4. Builder for frontend module gets a worktree created from frontend/.git (not backend/.git)
5. Contracts can span projects (e.g., an API contract bound to both backend and frontend modules)
6. The buildplan JSON stored in state.db contains modules with targetProject fields

## Pass Criteria
- Buildplan modules have valid targetProject values matching config.yaml project names
- Worktree paths are within the correct project directory
- No worktree is created from the wrong project's repo
- Build phase completes without errors related to project resolution