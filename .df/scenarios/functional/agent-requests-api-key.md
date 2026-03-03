---
name: agent-requests-api-key
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## Agent Requests API Key

### Preconditions
- A Dark Factory project is initialized (dark init)
- A run is active with at least one agent in 'running' status
- Agent ID is known (e.g., agt_01ABC)

### Steps
1. Run: dark agent request agt_01ABC --type secret --description 'Stripe test API key (sk_test_...) for payment integration tests'
2. Query the blocker_requests table: SELECT * FROM blocker_requests WHERE agent_id = 'agt_01ABC'
3. Query agent status: SELECT status FROM agents WHERE id = 'agt_01ABC'
4. Query events: SELECT * FROM events WHERE agent_id = 'agt_01ABC' AND type = 'blocker-requested'
5. Run: dark blockers (should list the pending blocker)

### Expected Results
- blocker_requests record exists with type='secret', status='pending', description matching input
- Agent status is 'blocked'
- An event of type 'blocker-requested' exists with the agent_id and blocker details
- dark blockers output includes this blocker with agent ID, type, description, and timestamp
- The request command does NOT return immediately — it enters a polling loop waiting for resolution

### Pass/Fail Criteria
- PASS: All expected results verified
- FAIL: Any of: no blocker record created, agent not marked blocked, no event emitted, command returns immediately without polling