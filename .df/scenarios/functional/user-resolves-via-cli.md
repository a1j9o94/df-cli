---
name: user-resolves-via-cli
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## User Resolves Blocker via CLI

### Preconditions
- A blocker request exists with status='pending' and type='secret'
- The requesting agent is in 'blocked' status
- The blocker request ID is known (e.g., blk_01XYZ)

### Steps
1. Run: dark agent resolve blk_01XYZ --env STRIPE_KEY=sk_test_abc123
2. Query blocker_requests: SELECT * FROM blocker_requests WHERE id = 'blk_01XYZ'
3. Query agent status: SELECT status FROM agents WHERE id = '<agent-id>'
4. Check agent's environment: the env var STRIPE_KEY should be set to sk_test_abc123
5. Check events: SELECT * FROM events WHERE type = 'blocker-resolved'
6. Check mail: dark mail check --agent <agent-id> (should have resolution notification but NOT the secret value)

### Expected Results
- blocker_requests record has status='resolved', resolved_at is set
- Agent status changed from 'blocked' back to 'running'
- STRIPE_KEY environment variable is available to the agent process
- A 'blocker-resolved' event exists
- Mail notification sent to agent says blocker was resolved but does NOT contain the actual secret value
- If the run was paused (because this was the only active agent), run status returns to 'running'

### Pass/Fail Criteria
- PASS: Blocker resolved, agent unblocked, env var set, secret not in mail
- FAIL: Any of: blocker still pending, agent still blocked, env var not set, secret value appears in mail body