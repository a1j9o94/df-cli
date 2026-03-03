---
name: configurable-threshold
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Configurable threshold

### Preconditions
- Config overridden: build.max_module_retries = 1

### Setup
1. Create in-memory DB with schema
2. Create config with build.max_module_retries = 1
3. Create run, spec, and active buildplan with module X
4. Create exactly 1 failed builder agent for module X (status='failed', module_id='X')

### Test Steps
1. Call getModuleAttemptCount(db, runId, 'X') — should return 1
2. Check if count >= config.build.max_module_retries (1 >= 1) — should be true
3. Verify that the escalation path is triggered (mini-architect spawned, not a regular builder)
4. Additionally test with max_module_retries = 3:
   - With 2 failures, getModuleAttemptCount returns 2
   - 2 >= 3 is false — regular retry should happen, NOT escalation

### Expected Output
- With threshold=1 and 1 failure: escalation triggered
- With threshold=3 and 2 failures: no escalation (normal retry)

### Pass/Fail Criteria
- PASS: Escalation triggers exactly when count >= threshold, for various threshold values
- FAIL: Escalation triggers at wrong count, or does not trigger when count >= threshold