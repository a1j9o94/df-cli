---
name: agent-requests-api-key
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run and spawn a builder agent (status=running). STEPS: 1. Run: dark agent request <agent-id> --type secret --description 'Stripe test API key (sk_test_...) for payment integration tests'. 2. Verify blocker_requests table has new row with type=secret, status=pending, description matching input. 3. Verify agent status changed to 'blocked'. 4. Verify an event was emitted (type=agent-blocked or blocker-created). 5. Verify notification was sent (check messages table or notification output). 6. If this is the only active agent in the run, verify run status changed to 'paused'. PASS CRITERIA: All 6 verifications pass. Agent cannot proceed until blocker is resolved.