---
name: integration-tester-receives-contracts
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run with a buildplan containing 2+ contracts (e.g., a TypeScript interface contract and an API shape contract) has completed the build phase. Contracts are stored in the contracts table with full content.

STEPS:
1. Inspect the mail message sent to the integration-tester agent.
2. Parse the mail body and look for a 'Contracts' section.
3. Verify each contract from the buildplan includes:
   - Contract name
   - Contract description
   - Full contract content (the actual TypeScript interface or API shape — NOT just the name)
   - Bound modules listed

EXPECTED OUTPUT:
- The mail body contains a Contracts section with FULL content for each contract.
- Content includes actual TypeScript code/interface definitions, not just names.

PASS CRITERIA:
- Every contract from the buildplan appears in the mail.
- Each contract includes its full 'content' field (e.g., the TypeScript interface text).
- Contract names alone without content = FAIL.

FAIL CRITERIA:
- Mail says 'Contracts: ContractA, ContractB' (names only, no content).
- Any contract from the buildplan is missing.
- Content is truncated to the point of being unusable.