---
name: skip-architect-calls-extractScenariosFromSpec
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSWV42FHNT4KW7Z4G7GGPBQ
---

Verify that when --skip-architect is used, the engine calls extractScenariosFromSpec() to create scenarios from the spec before the build phase. Steps: 1. Read engine.ts and build.ts. 2. Find the skip-architect code path. 3. Verify extractScenariosFromSpec is called with the spec file path and .df/scenarios/ directory. Expected: Scenarios are extracted from spec before builders start when using --skip-architect.