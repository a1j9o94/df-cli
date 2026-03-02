---
name: no-shared-scenario-types-constant
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQGS6G0HH1CJ1PKMW5KN4P7
---

CHANGEABILITY SCENARIO: No shared SCENARIO_TYPES constant exists. The string array ['functional', 'change'] is duplicated in 6 locations: create.ts, list.ts, complete.ts, instruction-context.ts, evaluator.ts, instructions.ts. Adding a new scenario type requires finding and updating ALL 6 locations. A single shared constant (e.g. in types/index.ts or a config) would reduce this to 1. VERIFICATION: grep -rn "'functional'" src/ — count distinct files with hardcoded strings. PASS CRITERIA: PASS if SCENARIO_TYPES is defined once and imported by all 6 consumers. FAIL (expected) if 3+ files contain hardcoded type strings.