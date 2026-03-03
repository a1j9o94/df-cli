---
name: research-persists-across-agents
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSS7KKB53MFBSPK7CK20AE0
---

## Scenario: Research persists across agents (process boundaries)

### Preconditions
- Dark Factory project initialized (dark init)
- A run exists with a known run_id
- An architect agent exists

### Steps
1. Run (as architect): dark research add <architect-id> --label 'API endpoint reference' --content 'POST /api/v1/checkout accepts {items: Item[], currency: string}' --module payments
2. Verify command exits with code 0
3. Simulate architect process ending (the research is persisted in DB + filesystem)
4. Create or use a builder agent with a different agent_id in the SAME run
5. Run (as builder or any agent): dark research list --run-id <run-id>
6. Verify 'API endpoint reference' appears in the list
7. Run: dark research show <research-id>
8. Verify the full content is retrievable: 'POST /api/v1/checkout accepts {items: Item[], currency: string}'
9. Verify the .md file still exists in .df/research/<run-id>/

### Key Validation
- The research list and show commands do NOT require the original agent to be running
- Research is stored in SQLite DB + filesystem, so any agent in the same run can read it
- The --run-id filter correctly scopes to the run, not to any particular agent

### Pass/Fail Criteria
- PASS: A different agent (builder) can list and read research created by the architect. The data survived process boundary (DB + filesystem persistence).
- FAIL: Research not visible to the second agent, or content is corrupted/missing.