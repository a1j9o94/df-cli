---
name: add-scenario-type-requires-parser-and-dir-only
type: change
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Changeability Scenario: Add a new scenario type

### Modification Description
Add a new scenario type 'performance' to the system. This should test whether the extraction parser and directory structure are the only things that need changing — no engine changes should be required.

### Expected Changes
1. **Extraction parser** (`src/pipeline/scenarios.ts`): Add recognition for a `### Performance` subsection under `## Scenarios` in spec markdown
2. **Scenario directory**: The system should create `.df/scenarios/performance/` for performance scenarios
3. **Scenario list command** (`src/commands/scenario/list.ts`): The type loop iterates over scenario type directories — if it uses a hardcoded array like `['functional', 'change']`, 'performance' must be added there
4. **Scenario create command** (`src/commands/scenario/create.ts`): The type validation checks against 'functional' and 'change' — 'performance' must be added

### Areas That Should NOT Change
- `src/pipeline/engine.ts` — the pre-build gate checks for `.df/scenarios/functional/` existence, but adding a new type should not require engine changes (the gate checks functional as the minimum)
- `src/pipeline/build-phase.ts` — no build logic changes
- `src/pipeline/evaluation.ts` — evaluator handles scenario files generically

### Expected Effort
- Low (1-2 files for core change, plus 1-2 validation files)
- No architectural changes required
- The scenario type is an extension point, not a structural change

### Pass/Fail Criteria
- PASS: Adding 'performance' type requires only parser + directory + validation changes, no engine or build-phase modifications
- FAIL: Engine or build-phase must be modified to support the new type, indicating tight coupling