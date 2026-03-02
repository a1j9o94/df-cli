---
name: status-shows-spec-title
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: 'dark status' shows the spec title alongside the spec ID.

SETUP:
1. Initialize in-memory DB
2. Create a spec record with id=spec_01TEST, title='Add JWT authentication'
3. Create a run record referencing that spec, status=running, current_phase=build

EXECUTE:
Run 'dark status' (no options)

EXPECTED OUTPUT:
- The run summary line or detail MUST contain the spec title 'Add JWT authentication'
- The spec ID spec_01TEST should also still appear
- Example format: spec=spec_01TEST (Add JWT authentication) or similar

Also test with --run-id:
Run 'dark status --run-id run_01TEST'
- Spec line should show: spec_01TEST — Add JWT authentication (or similar format showing both)

PASS CRITERIA:
- Spec title string 'Add JWT authentication' appears in output
- Spec ID also appears (title supplements, doesn't replace)
- Works in both summary view and detail view