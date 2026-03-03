---
name: scenario-type-list-not-duplicated
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSWV42FHNT4KW7Z4G7GGPBQ
---

Verify that the list of scenario types (functional, change) is defined in ONE place and reused. Steps: 1. Count occurrences of hardcoded ["functional", "change"] array literals across src/. 2. Expected: Only one definition (e.g., SCENARIO_TYPE_MAP or a shared constant). Currently duplicated in scenarios.ts ensureScenariosExist() and evaluator-guards.ts countScenarios().