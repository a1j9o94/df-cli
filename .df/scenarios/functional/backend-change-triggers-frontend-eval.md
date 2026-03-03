---
name: backend-change-triggers-frontend-eval
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Backend Change Triggers Frontend Eval

## Preconditions
- Workspace with frontend/ and backend/ member projects
- A shared contract exists (e.g., OpenAPI spec or TypeScript interface) between projects
- Frontend has scenarios that depend on the backend API contract
- Both projects have been previously built and their scenarios passed

## Steps
1. Modify a backend API contract (e.g., change response shape of GET /api/users)
2. Run dark build on the workspace spec that covers this contract
3. Observe which phases execute

## Expected Output
1. The system detects the backend contract has changed
2. Frontend scenarios that reference the changed contract are re-evaluated
3. Frontend code is NOT rebuilt (only evaluated against new contract)
4. Backend code IS rebuilt with the contract change
5. dark status at workspace level shows:
   - Backend: building (or completed)
   - Frontend: evaluating (re-eval only, not full rebuild)

## Pass Criteria
- Frontend builders are NOT spawned (no full rebuild for frontend)
- Frontend evaluator IS spawned (re-evaluation triggered)
- Backend goes through full build pipeline
- Events table shows contract-change event with affected projects
- Dependency-aware triggering reduces total cost vs rebuilding both projects