---
name: engine-god-class-prevents-isolated-changes
type: change
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPM72BN3B90RRX8RBT51W2F
---

CHANGEABILITY SCENARIO: engine.ts is 1136 lines containing build phase (~300 lines), merge phase (~100 lines), cost estimation, mail instructions, agent spawning, and polling — all as private methods on PipelineEngine. Adding any cross-cutting concern (logging, metrics, error handling) requires modifying this single file. VERIFICATION: 1. wc -l src/pipeline/engine.ts shows 1136 lines. 2. executeBuildPhase is a private method (~line 840-1000), not an importable function. 3. executeResumeBuildPhase is another private method (~line 269-400). 4. sendInstructions handles 5 role cases inline (~line 623-772). 5. estimateCostIfMissing is private (~line 826). PASS CRITERIA: PASS if engine.ts is under 400 lines with build, merge, cost, and mail logic extracted to separate modules. FAIL (expected) if engine.ts exceeds 800 lines with all logic as private methods.