---
name: roadmap-view
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Roadmap shows specs grouped by dependency layer with status
PRECONDITIONS:
- Dark Factory project initialized
- 5 specs:
  - spec_A: no deps, status=completed
  - spec_B: depends_on=[spec_A], status=building
  - spec_C: depends_on=[spec_A], status=draft
  - spec_D: depends_on=[spec_B, spec_C], status=draft
  - spec_E: no deps, status=draft
STEPS:
1. Run: dark roadmap
2. Run: dark roadmap --json
EXPECTED:
- Step 1 (text output):
  Layer 0: spec_A (completed), spec_E (draft)
  Layer 1: spec_B (building), spec_C (draft)
  Layer 2: spec_D (draft)
  Shows status indicators for each spec
- Step 2 (JSON output):
  Array of layer objects: [{layer: 0, specs: [spec_A, spec_E]}, {layer: 1, specs: [spec_B, spec_C]}, {layer: 2, specs: [spec_D]}]
  Each spec includes id, title, status fields
VALIDATION:
- getSpecLayers returns correct layer assignments
- Specs with no dependencies are in layer 0
- Specs whose deps are all in lower layers are correctly placed
- Status reflects current DB state for each spec
PASS CRITERIA: Both text and JSON output show correct layering with accurate status.