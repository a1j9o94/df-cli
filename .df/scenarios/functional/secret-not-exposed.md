---
name: secret-not-exposed
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run, spawn agent, raise secret blocker, resolve with --env API_KEY=super_secret_value_12345. STEPS: 1. Run: dark mail check --agent <agent-id>. Verify the mail body does NOT contain 'super_secret_value_12345'. It should say something like 'Secret API_KEY has been set as environment variable' without the actual value. 2. Run: dark agent show <agent-id>. Verify output does not contain the secret value. 3. Check events table for the resolution event. Verify event data does not contain the secret value. 4. Run: dark secrets list. Verify it shows 'API_KEY' exists but NOT its value. 5. Verify the secret IS accessible to the agent process via environment variable. PASS CRITERIA: Secret value appears NOWHERE in logs, mail, events, or dashboard — only as an env var for the agent process.