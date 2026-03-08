---
name: decision-blocker-flow
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run, spawn an architect agent (status=running). STEPS: 1. Run: dark agent request <agent-id> --type decision --description 'Spec says add auth but does not specify method. OAuth2, magic link, or username/password?'. 2. Verify agent status is 'blocked', blocker type is 'decision'. 3. Run: dark agent resolve <request-id> --value 'OAuth2'. 4. Verify the resolution value 'OAuth2' is delivered to the agent via mail. 5. Verify agent status returns to 'running'. 6. Verify the resolved blocker record stores both the question and answer for audit trail. PASS CRITERIA: Decision blockers use --value (not --env), value IS visible in mail (unlike secrets), agent resumes with the answer.