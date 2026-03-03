---
name: multiple-blockers
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## Multiple Simultaneous Blockers

### Preconditions
- A run is active with 2+ agents in 'running' status (e.g., agt_01A and agt_01B)

### Steps
1. Agent A requests: dark agent request agt_01A --type secret --description 'AWS access key for S3 integration'
2. Agent B requests: dark agent request agt_01B --type resource --description 'OpenAPI spec for backend API'
3. Run: dark blockers --run-id <run-id>
4. Verify both blockers appear in the list with correct details
5. Resolve Agent A's blocker: dark agent resolve <blocker-A-id> --env AWS_ACCESS_KEY=AKIA123
6. Verify: Agent A status returns to 'running', Agent B still 'blocked'
7. Run: dark blockers --run-id <run-id>
8. Verify: Only Agent B's blocker still shows as pending
9. Resolve Agent B's blocker: dark agent resolve <blocker-B-id> --file /path/to/openapi.yaml
10. Verify: Both agents now running, no pending blockers

### Expected Results
- Both blockers created independently with unique IDs
- dark blockers lists both when both are pending
- Resolving one blocker only unblocks that specific agent
- The other agent remains blocked until its blocker is resolved
- After both resolved, dark blockers shows no pending blockers (resolved ones stay in history)
- Run only resumes (if paused) when ALL blockers are resolved

### Pass/Fail Criteria
- PASS: Both blockers created, resolved independently, agents resume independently
- FAIL: Any of: blockers interfere with each other, resolving one affects the other, agents not independent