---
name: module-succeeds-on-retry
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Module succeeds on retry (no redecomposition)

### Preconditions
- Config: build.max_module_retries = 2 (default)
- Module X has failed exactly 1 time (under threshold)

### Setup
1. Create in-memory DB with schema
2. Create run, spec, and active buildplan with modules A and X (X depends on A)
3. Create 1 failed builder agent for module X (status='failed')
4. Module A is completed

### Test Steps
1. Call getModuleAttemptCount(db, runId, 'X') — should return 1
2. Check if count >= config.build.max_module_retries (1 >= 2) — should be false
3. Verify that the normal retry path is followed:
   - A regular builder agent is spawned for module X (role='builder', module_id='X')
   - No mini-architect agent is spawned
4. Simulate the new builder completing successfully (status='completed')
5. Verify:
   - The buildplan is NOT modified (no patchBuildplan called)
   - No 'module-redecomposed' event was emitted
   - Module X is in completedModules set
   - The build phase completes normally

### Expected Output
- Attempt count is 1, below threshold of 2
- Regular builder spawned for module X
- Build completes normally without redecomposition

### Pass/Fail Criteria
- PASS: No escalation triggered, regular builder spawned, build completes
- FAIL: Escalation triggered prematurely (mini-architect spawned when count < threshold)