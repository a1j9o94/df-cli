---
name: add-evaluation-phase-for-new-scenario-type
type: change
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPM72BN3B90RRX8RBT51W2F
---

CHANGEABILITY SCENARIO: Adding a new scenario type (e.g., performance) requires changes in 5+ locations due to tight coupling: (1) scenario/create.ts type validation, (2) evaluator.ts prompt hardcoded paths, (3) engine.ts evaluator mail instructions, (4) instruction-context.ts readScenarios hardcoded array, (5) phases.ts would need a new evaluate-performance phase name. A single-point configuration should drive all 5. MODIFICATION STEPS: 1. Define SCENARIO_TYPES constant: ['functional', 'change', 'performance'] in a shared config. 2. create.ts validates against SCENARIO_TYPES. 3. evaluator.ts and engine.ts build paths from SCENARIO_TYPES dynamically. 4. readScenarios reads SCENARIO_TYPES instead of hardcoded array. 5. Phase loop parameterizes evaluation by type instead of per-phase. EXPECTED EFFORT: If well-architected, 1 line (add to array). Currently ~20 lines across 5 files. PASS CRITERIA: PASS if adding a scenario type requires updating ONE shared constant. FAIL (expected) if it requires editing 3+ files with string literals.