---
name: scenario-type-hardcoded-in-evaluator-prompt
type: change
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP56F9VX5MEQVEJE8BANG6Q
---

CHANGEABILITY SCENARIO: Adding a new scenario type (e.g., performance) requires updating hardcoded strings in multiple places, not just the create command. VERIFICATION: 1. src/commands/scenario/create.ts line 37 hardcodes 'functional' and 'change' only. 2. src/pipeline/engine.ts line 633 hardcodes 'Scenarios are in .df/scenarios/functional/ and .df/scenarios/change/' in evaluator instructions. 3. src/agents/prompts/evaluator.ts line 30 hardcodes 'Read each scenario file from .df/scenarios/functional/ and .df/scenarios/change/'. 4. No src/pipeline/scenarios.ts extraction parser exists. PASS CRITERIA: PASS if adding a new scenario type requires changes ONLY to create.ts type validation. FAIL (expected) if engine.ts evaluator instructions and evaluator.ts prompt also need updating.