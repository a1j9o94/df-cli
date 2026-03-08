---
name: user-resolves-via-cli-env
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run, spawn a builder agent, raise a secret blocker request (agent is blocked). Record the request ID. STEPS: 1. Run: dark agent resolve <request-id> --env STRIPE_KEY=sk_test_abc123. 2. Verify blocker_requests row updated: status=resolved, resolved_value is NOT plain text (encrypted or env-ref). 3. Verify agent received a mail message with resolution notification (NOT containing the secret value in plain text). 4. Verify the secret is set as an environment variable reference for the agent. 5. Verify agent status changed back to 'running'. 6. If run was paused due to this blocker, verify run status changed back to 'running'. 7. Verify a resolution event was emitted. PASS CRITERIA: Agent resumes, secret is accessible as env var, secret value not in mail body or event logs.