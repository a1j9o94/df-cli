---
name: engine-keeps-orchestration-methods
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPFGY2WBZ0213X7W4G0YTRZ
---

Precondition: Module 5 (wire-engine) has been applied to engine.ts.

Steps:
1. Verify engine.ts still exports the PipelineEngine class:
   - grep for 'export class PipelineEngine' — should match

2. Verify engine.ts still contains the execute() method:
   - grep for 'async execute(' — should match

3. Verify engine.ts still contains the resume() method:
   - grep for 'async resume(' — should match

4. Verify engine.ts still contains the executePhase() method:
   - grep for 'executePhase(' — should match (as private method)

5. Verify engine.ts still contains the advancePhase() method:
   - grep for 'async advancePhase(' — should match

6. Verify engine.ts still contains the handlePhaseFailure() method:
   - grep for 'async handlePhaseFailure(' — should match

7. Verify engine.ts still contains the sleep() helper:
   - grep for 'sleep(' — should match

Expected: All orchestration methods remain in engine.ts. Only the extracted methods are removed.
Pass criteria: All 7 grep checks find matches in engine.ts.