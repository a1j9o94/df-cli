---
name: engine-calls-ensureScenariosExist-before-build
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSWV42FHNT4KW7Z4G7GGPBQ
---

Verify that src/pipeline/engine.ts (or build-phase.ts) imports and calls ensureScenariosExist() from scenarios.ts before spawning builders. Steps: 1. Read engine.ts and build-phase.ts. 2. Check for import of ensureScenariosExist. 3. Verify it is called before executeBuildPhase. Expected: ensureScenariosExist is called as a pre-build gate. If missing, the pre-build gate requirement is unmet.