---
name: run-pauses-when-only-agent-blocked
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run with a single builder agent (status=running), run status=running. STEPS: 1. Run: dark agent request <agent-id> --type access --description 'Need read access to private repo org/backend'. 2. Verify agent status is 'blocked'. 3. Since this is the ONLY active agent in the run, verify run status changed to 'paused' with pause_reason indicating blocker. 4. Verify a run-paused event was emitted. 5. Now resolve: dark agent resolve <req-id> --value 'Access granted, repo cloned to /tmp/backend'. 6. Verify agent resumes (status=running). 7. Verify run resumes (status=running). PASS CRITERIA: Run auto-pauses when all agents are blocked, auto-resumes when any agent unblocks.