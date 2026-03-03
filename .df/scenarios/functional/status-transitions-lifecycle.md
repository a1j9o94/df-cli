---
name: status-transitions-lifecycle
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Tests the full spec status lifecycle. Steps: 1) Create a new spec. Verify status is 'draft'. 2) Start a build. Verify spec status transitions to 'building' (check DB after engine.execute begins or after build command sets it). 3a) If build succeeds: verify spec status is 'completed'. 3b) If build fails: verify spec status returns to 'draft' (retriable). 4) For a spec with status 'completed': attempt to set status back to 'draft' programmatically via updateSpecStatusChecked or equivalent. Expected: Transition is rejected with an error. 5) For a spec with status 'completed': run 'dark build <spec-id>'. Expected: Rejected (Guard 1). 6) Verify the valid transition map: draft->building (OK), building->completed (OK), building->draft (OK on failure), completed->draft (REJECT), completed->building (REJECT), archived->building (REJECT), archived->draft (REJECT). Pass criteria: All valid transitions succeed. All invalid transitions are rejected with clear error messages.