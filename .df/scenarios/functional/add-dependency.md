---
name: add-dependency
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Add dependency between specs
PRECONDITIONS:
- Dark Factory project initialized with state.db
- Two specs exist: spec_A (status=draft, no dependencies) and spec_B (status=draft, no dependencies)
STEPS:
1. Run: dark spec add-dep <spec_B_id> --on <spec_A_id>
2. Run: dark spec blocked
3. Run: dark spec ready
4. Run: dark spec deps <spec_B_id>
EXPECTED:
- Step 1: Command succeeds with confirmation message
- Step 2: spec_B appears in blocked list, showing it is blocked by spec_A
- Step 3: spec_A appears in ready list (no unmet deps), spec_B does NOT appear
- Step 4: Shows spec_A as a dependency of spec_B
VALIDATION:
- DB table spec_dependencies has row: (spec_id=spec_B, depends_on_spec_id=spec_A)
- SpecFrontmatter of spec_B file contains depends_on: [spec_A_id]
PASS CRITERIA: All 4 expected outputs match. spec_B is blocked, spec_A is ready.