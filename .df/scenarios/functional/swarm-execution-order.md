---
name: swarm-execution-order
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Swarm builds specs in correct dependency order with parallelism
PRECONDITIONS:
- Dark Factory project initialized
- 4 specs created:
  - spec_A: no dependencies (draft)
  - spec_B: depends_on=[spec_A] (draft)
  - spec_C: depends_on=[spec_A] (draft)
  - spec_D: depends_on=[spec_B, spec_C] (draft)
STEPS:
1. Run: dark swarm --dry-run
2. Verify the execution plan
EXPECTED:
- Layer 0: [spec_A] — built first (no deps)
- Layer 1: [spec_B, spec_C] — built in parallel after spec_A completes
- Layer 2: [spec_D] — built after both spec_B and spec_C complete
- Dry run output shows this 3-layer plan with correct groupings
- No actual builds are started (dry-run mode)
VALIDATION:
- getSpecLayers(db) returns 3 layers with correct spec assignments
- Layer 0 contains only spec_A
- Layer 1 contains spec_B and spec_C (order within layer does not matter)
- Layer 2 contains only spec_D
- No runs are created in the runs table
PASS CRITERIA: Dry run output matches the expected 3-layer DAG. No builds executed.