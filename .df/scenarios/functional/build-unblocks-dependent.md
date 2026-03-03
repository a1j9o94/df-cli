---
name: build-unblocks-dependent
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Building a spec unblocks its dependents
PRECONDITIONS:
- Dark Factory project initialized
- spec_A exists with status=draft, no dependencies
- spec_B exists with status=draft, depends_on=[spec_A]
- spec_B appears in dark spec blocked output
STEPS:
1. Verify spec_B is in blocked list: dark spec blocked
2. Simulate spec_A completion: Update spec_A status to completed in DB
3. Run: dark spec ready
4. Run: dark spec blocked
EXPECTED:
- Step 1: spec_B listed as blocked by spec_A
- Step 3: spec_B now appears in ready list (spec_A is completed, so dep is satisfied)
- Step 4: spec_B no longer appears in blocked list (empty or other specs only)
VALIDATION:
- getReadySpecs(db) returns spec_B after spec_A is completed
- getBlockedSpecs(db) does NOT include spec_B after spec_A completion
PASS CRITERIA: spec_B transitions from blocked to ready when spec_A completes.