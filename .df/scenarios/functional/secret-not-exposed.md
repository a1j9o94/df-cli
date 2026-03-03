---
name: secret-not-exposed
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## Secret Values Not Exposed

### Preconditions
- A secret-type blocker exists and has been resolved with value 'sk_test_sensitive_key_123'

### Steps
1. Create a secret blocker: dark agent request <agent-id> --type secret --description 'Stripe API key'
2. Resolve it: dark agent resolve <blocker-id> --env STRIPE_KEY=sk_test_sensitive_key_123
3. Check mail: dark mail check --agent <agent-id> — search all message bodies for 'sk_test_sensitive_key_123'
4. Check events: SELECT data FROM events WHERE type = 'blocker-resolved' AND agent_id = '<agent-id>' — search for 'sk_test_sensitive_key_123'
5. Check dashboard API: GET /api/runs/<run-id>/blockers — check if any blocker response contains 'sk_test_sensitive_key_123'
6. Check dashboard agent details: GET /api/runs/<run-id>/agents — search responses for the secret value
7. Check DB directly: SELECT value FROM blocker_requests WHERE id = '<blocker-id>' — value should be encrypted, not plain text
8. Run: dark secrets list — should show 'STRIPE_KEY' name but NOT the value

### Expected Results
- The secret value 'sk_test_sensitive_key_123' does NOT appear in:
  - Mail messages (body field in messages table)
  - Event data (data field in events table)
  - Dashboard API responses (any endpoint)
  - Agent detail views
- The value in blocker_requests table is encrypted (not plain text 'sk_test_sensitive_key_123')
- dark secrets list shows the secret name only, not value
- The secret IS available as an env var to the agent process

### Pass/Fail Criteria
- PASS: Secret value never appears in any readable location except as env var
- FAIL: Secret value found in ANY of: mail, events, dashboard API, DB plain text, logs