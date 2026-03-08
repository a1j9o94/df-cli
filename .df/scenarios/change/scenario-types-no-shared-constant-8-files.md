---
name: scenario-types-no-shared-constant-8-files
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7T4F32F6SA6R6BNRB2HGS2
---

CHANGEABILITY SCENARIO: Scenario types 'functional' and 'change' are hardcoded string literals in 8 locations with no shared SCENARIO_TYPES constant: (1) create.ts validation, (2) list.ts type loop, (3) complete.ts type loop, (4) instruction-context.ts readScenarios loop, (5) evaluator.ts prompt text, (6) instructions.ts prompt text, (7) phases.ts PhaseName union + PHASE_ORDER, (8) engine.ts executePhase switch. Adding a new scenario type like 'performance' requires editing all 8 files. PASS if a shared SCENARIO_TYPES constant exists and drives all locations. FAIL if types are hardcoded in 3+ independent files.