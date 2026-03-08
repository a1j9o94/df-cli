---
name: backend-change-triggers-frontend-eval
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Backend Change Triggers Frontend Eval

### Preconditions
- Workspace with backend/ and frontend/ projects
- Shared contract exists (e.g., OpenAPI spec or TypeScript interface)
- Frontend scenarios depend on the shared contract
- Both projects have completed a successful build

### Steps
1. Modify a backend API contract (e.g., change response schema in shared contract)
2. Run dark build on the workspace
3. Observe which projects are affected

### Expected Output
- The system detects the contract change affects frontend scenarios
- Frontend scenarios that depend on the changed contract are re-evaluated
- Frontend code is NOT rebuilt from scratch — only re-evaluation occurs
- Backend changes are built normally
- dark status shows cross-project dependency awareness

### Pass/Fail
- PASS: Frontend re-evaluation triggered without full rebuild, backend builds normally
- FAIL: Frontend fully rebuilt, or frontend evaluation not triggered at all