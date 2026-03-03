---
name: build-blocked-after-architect-no-scenarios
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Scenario: Build blocked when architect ran but created no scenarios

### Preconditions
- A Dark Factory project is initialized
- A spec exists
- The architect phase has completed (skip_architect is false)
- No scenario files exist in `.df/scenarios/functional/` or `.df/scenarios/change/`
  (simulate: architect ran but its guard was bypassed or scenarios were deleted between architect and build)

### Steps
1. Set up a pipeline run where skip_architect is false
2. Manually ensure `.df/scenarios/` directories are empty (no .md files)
3. The engine reaches the build phase
4. The pre-build gate checks for scenarios

### Expected Results
- The `ensureScenariosExist()` function is called
- It detects zero scenario files on disk
- Since skip_architect was NOT used (architect should have created them), it throws an error
- Error message: 'No holdout scenarios found. The architect must create scenarios before build can start.'
- The pipeline fails with this error
- The build phase never starts (no builder agents are spawned)

### Pass/Fail Criteria
- PASS: Pipeline throws with the exact error message before spawning any builders
- FAIL: Build phase starts without scenarios, OR a different/unclear error is thrown, OR the pipeline auto-extracts scenarios (it should NOT extract when architect was supposed to run)