---
name: architect-saves-url-reference
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSS7KKB53MFBSPK7CK20AE0
---

## Scenario: Architect saves a URL reference

### Preconditions
- Dark Factory project initialized (dark init)
- A run exists with a known run_id
- An architect agent exists with a known agent_id

### Steps
1. Run: dark research add <agent-id> --label 'Stripe SDK docs' --content 'https://stripe.com/docs/api Use stripe@14.x, not 13.x — breaking changes in webhook signatures'
2. Verify command exits with code 0
3. Run: dark research list --run-id <run-id>
4. Verify the output includes 'Stripe SDK docs' label
5. Capture the research-id from the output
6. Run: dark research show <research-id>
7. Verify the output contains the exact content: 'https://stripe.com/docs/api Use stripe@14.x, not 13.x — breaking changes in webhook signatures'
8. Verify a .md file exists in .df/research/<run-id>/ directory containing the content
9. Verify the research_artifacts table has a row with: type='text', label='Stripe SDK docs', agent_id=<agent-id>, run_id=<run-id>

### Pass/Fail Criteria
- PASS: All verifications succeed. Research is stored in both DB and filesystem, and is retrievable via CLI.
- FAIL: Any verification step fails — missing DB row, missing file, wrong content, or non-zero exit code.