---
name: scenario-types-hardcoded-in-six-locations
type: change
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ6TWKN08G27EV0C7MWFTZ2
---

CHANGEABILITY SCENARIO: Adding a new scenario type (e.g. 'performance') requires updating string literals in 6+ locations: (1) src/commands/scenario/create.ts line 37 type validation, (2) src/commands/scenario/list.ts line 30 type iteration loop, (3) src/commands/agent/complete.ts line 75 type iteration loop, (4) src/pipeline/instruction-context.ts line 197 readScenarios type loop, (5) src/agents/prompts/evaluator.ts line 30 hardcoded paths, (6) src/pipeline/instructions.ts line 138 evaluator body paths. No shared SCENARIO_TYPES constant exists. VERIFICATION: Grep for ['functional', 'change'] patterns across src/. PASS CRITERIA: PASS if adding a scenario type requires updating ONE shared constant. FAIL (expected) if 3+ files contain hardcoded type strings.