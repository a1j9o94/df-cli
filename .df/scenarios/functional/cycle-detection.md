---
name: cycle-detection
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Cycle detection rejects circular dependencies
PRECONDITIONS:
- Dark Factory project initialized
- spec_A, spec_B, spec_C exist (all draft, no dependencies initially)
- spec_A depends on spec_B (added via dark spec add-dep A --on B)
- spec_B depends on spec_C (added via dark spec add-dep B --on C)
STEPS:
1. Run: dark spec add-dep <spec_C_id> --on <spec_A_id>
EXPECTED:
- Step 1: Command FAILS with an error message containing the word 'cycle' (case-insensitive)
- The dependency C->A is NOT added to the database
- Existing dependencies A->B and B->C remain intact
VALIDATION:
- wouldCreateCycle(db, spec_C, spec_A) returns true
- DB spec_dependencies table does NOT contain (spec_id=spec_C, depends_on_spec_id=spec_A)
- getSpecDependencies(db, spec_C) returns empty array (no deps)
PASS CRITERIA: Command exits with non-zero code, prints cycle error, does not create the dependency.