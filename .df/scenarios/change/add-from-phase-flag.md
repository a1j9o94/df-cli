---
name: add-from-phase-flag
type: change
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

CHANGEABILITY SCENARIO: Add --from-phase flag to force restart from specific phase

DESCRIPTION:
Add a --from-phase option to dark continue that overrides the auto-detected resume point. For example:
  dark continue <run-id> --from-phase build
This should force the pipeline to restart from the 'build' phase even if build had previously completed.

MODIFICATION STEPS:
1. Add --from-phase <phase> option to the continue command in src/commands/continue.ts
2. Validate that the phase name is a valid PhaseName (from PHASE_ORDER)
3. Pass fromPhase through ResumeOptions to the engine
4. In engine resume logic: if fromPhase is provided, use it instead of getResumePoint() result
5. The getResumePoint() function should NOT need modification — fromPhase bypasses it entirely

AFFECTED AREAS:
- src/commands/continue.ts — add CLI option parsing
- ResumeOptions type — already has fromPhase?: PhaseName field in the contract
- Engine resume method — add conditional: if (options.fromPhase) use it, else call getResumePoint()

EXPECTED EFFORT:
- ~15 lines of code changes across 2 files
- No new files needed
- No DB schema changes
- No changes to getResumePoint() logic

VERIFICATION:
1. Run with completed build phase: dark continue <run-id> --from-phase build
2. Verify build phase re-executes (new builders spawned even though old ones completed)
3. Verify phases BEFORE build are still skipped (scout, architect, plan-review)
4. Verify invalid phase names are rejected with helpful error: dark continue <run-id> --from-phase invalid-name
5. Verify --from-phase works alongside other flags like --budget-usd

PASS CRITERIA:
- getResumePoint() function is unchanged (no modifications)
- --from-phase accepts any valid PhaseName
- --from-phase rejects invalid phase names with clear error
- The flag is purely additive — removing it doesn't break existing continue behavior
- Total diff is under 30 lines