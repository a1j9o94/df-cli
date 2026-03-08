---
name: multiple-blockers-independent-resolution
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

SETUP: Create a run with 2 builder agents (agent-A and agent-B), both running. STEPS: 1. agent-A requests: dark agent request <agent-A-id> --type secret --description 'GitHub token for private repo access'. 2. agent-B requests: dark agent request <agent-B-id> --type resource --description 'OpenAPI spec file for backend API'. 3. Run: dark blockers --run-id <run-id>. Verify both blockers listed with correct agent IDs, types, descriptions, and pending status. 4. Resolve agent-A blocker: dark agent resolve <req-A-id> --env GITHUB_TOKEN=ghp_xxx. 5. Verify agent-A resumes (status=running), agent-B stays blocked. 6. Verify dark blockers shows only agent-B blocker as pending. 7. Resolve agent-B blocker: dark agent resolve <req-B-id> --file /path/to/openapi.yaml. 8. Verify agent-B resumes. PASS CRITERIA: Blockers are independent. Resolving one does not affect others. dark blockers correctly reflects current state.