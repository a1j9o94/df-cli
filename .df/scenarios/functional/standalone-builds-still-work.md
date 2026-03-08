---
name: standalone-builds-still-work
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Standalone Builds Still Work

### Preconditions
- Workspace initialized with backend/ and frontend/
- backend/ has its own .df/ with a standalone spec

### Steps
1. cd backend/
2. Run dark build <backend-spec-id> (using backend's own .df/)
3. Verify build runs using backend/.df/ configuration
4. Verify build does NOT use .df-workspace/ at all

### Expected Output
- Build succeeds using backend/.df/ only
- Worktrees created in backend/.df/worktrees/
- No workspace-level state is modified
- dark status shows only backend project runs

### Pass/Fail
- PASS: Standalone build works exactly as before workspace existed
- FAIL: Build errors, references workspace config, or creates worktrees outside backend/