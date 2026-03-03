---
name: decision-blocker
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## Decision Blocker Flow

### Preconditions
- A run is active with an architect agent in 'running' status
- Agent ID is known (e.g., agt_01ARCH)

### Steps
1. Run: dark agent request agt_01ARCH --type decision --description 'Spec says add auth but does not specify method. OAuth2, magic link, or username/password?'
2. Verify: blocker_requests record created with type='decision', status='pending'
3. Verify: agent status is 'blocked'
4. Verify: run is paused if this is the only active agent
5. Run: dark agent resolve <blocker-id> --value 'OAuth2'
6. Verify: blocker resolved, value stored as plain text (not encrypted — only secrets are encrypted)
7. Verify: agent receives mail with the answer 'OAuth2'
8. Verify: agent status returns to 'running'
9. Verify: run resumes if it was paused

### Expected Results
- Decision-type blockers store values in plain text (not encrypted like secrets)
- The resolved value 'OAuth2' appears in the mail sent to the agent
- Agent transitions: running → blocked → running
- Run transitions: running → paused → running (if sole agent)
- Events: blocker-requested, blocker-resolved both emitted

### Pass/Fail Criteria
- PASS: Full round-trip works, value delivered via mail, agent and run resume
- FAIL: Any of: wrong blocker type, value not in mail, agent stays blocked, run stays paused