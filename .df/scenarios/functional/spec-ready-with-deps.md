---
name: spec-ready-with-deps
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: spec ready only returns specs with all dependencies completed
PRECONDITIONS:
- Dark Factory project initialized
- spec_A: status=completed, no deps
- spec_B: status=draft, depends_on=[spec_A] — dep is completed
- spec_C: status=draft, depends_on=[spec_A, spec_D] — spec_D is NOT completed
- spec_D: status=draft, no deps
- spec_E: status=draft, no deps
STEPS:
1. Run: dark spec ready
EXPECTED:
- Returns: spec_B, spec_D, spec_E
- Does NOT return: spec_A (already completed), spec_C (spec_D not yet completed)
- spec_B is ready because its only dep (spec_A) is completed
- spec_D is ready because it has no dependencies
- spec_E is ready because it has no dependencies
- spec_C is NOT ready because spec_D (one of its deps) is still draft
VALIDATION:
- getReadySpecs(db) returns exactly [spec_B, spec_D, spec_E] (order may vary)
- Completed specs are excluded from ready list
- Specs with ANY incomplete dependency are excluded
PASS CRITERIA: Only specs with all deps satisfied AND status in (draft, ready) are returned.