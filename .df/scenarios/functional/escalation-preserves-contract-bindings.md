---
name: escalation-preserves-contract-bindings
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSZYES0AT3VR86H9FW4J4S0
---

## Escalation preserves contract bindings

### Preconditions
- Module X is bound to contracts C1 and C2
- Module X has failed 2+ times and is being escalated to sub-modules X1 and X2

### Setup
1. Create run with buildplan containing module X bound to contracts C1 (producer) and C2 (consumer)
2. Create 2 failed builder agents for module X

### Test Steps
1. Trigger escalation for module X
2. Verify that after patchBuildplan, the contract bindings are updated:
   - X1 and X2 should be bound to C1 and C2 (replacing X's bindings)
   - OR: the contracts section of the plan is updated to reference sub-modules
3. Check that no contract violations occur due to the module replacement

### Expected Output
- Sub-modules inherit contract responsibilities from the original module
- No orphaned contract references to deleted module X

### Pass/Fail Criteria
- PASS: Contract bindings correctly transferred to sub-modules
- FAIL: Orphaned bindings referencing module X, or sub-modules missing contract bindings