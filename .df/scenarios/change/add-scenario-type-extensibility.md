---
name: add-scenario-type-extensibility
type: change
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Changeability Test: Adding a new scenario type (e.g. 'performance')

### Modification Description
Add support for a new scenario type called 'performance' (in addition to existing 'functional' and 'change' types).

### Expected Affected Areas
1. **Scenario extraction parser** (src/pipeline/scenarios.ts): Must recognize a new ### Performance subsection under ## Scenarios and write files to .df/scenarios/performance/
2. **Scenario directory structure**: New directory .df/scenarios/performance/ must be created
3. **Scenario create command** (src/commands/scenario/create.ts): Type validation must accept 'performance' in addition to 'functional' and 'change'

### Areas That Should NOT Need Changes
- src/pipeline/engine.ts (the pre-build gate checks for files generically, not by type)
- The engine's phase loop
- The evaluator spawning logic (scenario IDs are passed by reference, not by type)

### Expected Effort
- Small: 3-5 lines in the parser (add 'performance' to the type mapping and subsection parsing)
- Small: 1 line in create command (add 'performance' to type validation)
- Zero lines in engine.ts

### Pass/Fail Criteria
- PASS: Adding 'performance' type requires changes ONLY to the extraction parser, scenario create command type validation, and directory setup — no changes to engine.ts executeBuildPhase, evaluation.ts, or any agent prompt files
- FAIL: Adding the type requires changes to the engine phase loop, evaluator, or other core pipeline files