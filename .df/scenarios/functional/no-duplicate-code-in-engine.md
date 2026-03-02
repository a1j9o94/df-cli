---
name: no-duplicate-code-in-engine
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPFGY2WBZ0213X7W4G0YTRZ
---

Precondition: All 5 modules have been built and merged.

Steps:
1. Verify engine.ts does NOT contain a private method definition for sendInstructions:
   - grep for 'private sendInstructions' or 'private async sendInstructions' in engine.ts — should NOT match

2. Verify engine.ts does NOT contain a private method definition for executeBuildPhase:
   - grep for 'private executeBuildPhase' or 'private async executeBuildPhase' in engine.ts — should NOT match

3. Verify engine.ts does NOT contain a private method definition for executeResumeBuildPhase:
   - grep for 'private executeResumeBuildPhase' or 'private async executeResumeBuildPhase' in engine.ts — should NOT match

4. Verify engine.ts does NOT contain a private method definition for executeMergePhase:
   - grep for 'private executeMergePhase' or 'private async executeMergePhase' in engine.ts — should NOT match

5. Verify engine.ts does NOT contain a private method definition for waitForAgent:
   - grep for 'private waitForAgent' or 'private async waitForAgent' in engine.ts — should NOT match

6. Verify engine.ts does NOT contain a private method definition for executeAgentPhase:
   - grep for 'private executeAgentPhase' or 'private async executeAgentPhase' in engine.ts — should NOT match

7. Verify engine.ts does NOT contain a private method definition for estimateCostIfMissing:
   - grep for 'private estimateCostIfMissing' in engine.ts — should NOT match

8. Verify engine.ts DOES contain import statements for the extracted modules:
   - grep for 'from "./instructions' in engine.ts — should match
   - grep for 'from "./agent-lifecycle' in engine.ts — should match
   - grep for 'from "./build-phase' in engine.ts — should match
   - grep for 'from "./merge-phase' in engine.ts — should match

Expected: All extracted method definitions are gone from engine.ts. All imports from new modules are present.
Pass criteria: Steps 1-7 find NO matches. Step 8 finds ALL 4 imports.