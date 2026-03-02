---
name: build-blocked-without-scenarios
type: functional
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Test: Build phase blocked when no scenarios exist

### Preconditions
- A spec exists and an architect agent has been spawned and completed
- Somehow, no scenario files exist in .df/scenarios/functional/ or .df/scenarios/change/ (e.g., architect guard was bypassed, or scenarios were deleted after architect completed)

### Steps
1. Ensure .df/scenarios/functional/ and .df/scenarios/change/ contain zero .md files
2. Trigger the build phase in the pipeline engine (not via --skip-architect — the architect ran but produced no scenarios)
3. Observe what happens when the engine transitions from architect/plan-review to build phase

### Expected Results
- The pipeline engine refuses to enter the build phase
- Error message is clear: 'No holdout scenarios found. The architect must create scenarios before build can start.'
- The run status is set to 'failed' with this error
- No builder agents are spawned
- A 'run-failed' event is created with the error details

### Pass/Fail Criteria
- PASS: Pipeline fails with the exact error message before any builder is spawned
- FAIL: Build phase starts without scenarios, or error message is different/unclear