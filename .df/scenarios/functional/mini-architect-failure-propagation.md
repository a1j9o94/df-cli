---
name: mini-architect-failure-propagation
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSZYES0AT3VR86H9FW4J4S0
---

## Mini-architect failure propagation

### Preconditions
- Module X has failed 2+ times (threshold met)
- Mini-architect will fail when spawned

### Setup
1. Create run with module X that has 2 failed builders
2. Mock runtime where mini-architect agent completes with status='failed'

### Test Steps
1. Trigger escalation for module X
2. The escalateModule function should throw an error when mini-architect fails
3. Verify the error message includes 'Mini-architect failed for module X'
4. Verify the build phase does NOT hang - it should propagate the error
5. Verify no module-redecomposed event was emitted (since mini-architect failed)

### Expected Output
- escalateModule throws error with descriptive message
- No buildplan patching occurs
- No module-redecomposed event
- Build phase can handle the error (either retry escalation or fail the run)

### Pass/Fail Criteria
- PASS: Error propagates correctly, no silent failures
- FAIL: Build phase hangs or silently swallows the mini-architect failure