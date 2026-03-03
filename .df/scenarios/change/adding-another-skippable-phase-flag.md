---
name: adding-another-skippable-phase-flag
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Change Scenario: Adding another --skip-X flag for a different phase

### Modification:
Add a new boolean flag --skip-functional-eval that skips the evaluate-functional phase, following the same pattern as --skip-change-eval.

### Affected Areas:
1. src/commands/build.ts — Add new .option('--skip-functional-eval', ...)
2. src/types/run.ts — Add skip_functional_eval: boolean to RunRecord and RunCreateInput
3. src/types/config.ts — Add skip_functional_eval: boolean to DfConfig.build
4. src/db/schema.ts — Add skip_functional_eval column
5. src/db/queries/runs.ts — Handle skip_functional_eval in createRun
6. src/pipeline/phases.ts — Add case for evaluate-functional in shouldSkipPhase
7. src/pipeline/engine.ts — Propagate skip_functional_eval through context

### Expected Effort:
- LOW effort: Each file needs 1-3 lines added following the same pattern as skip_change_eval
- The pattern should be clearly established by the skip_change_eval implementation
- No architectural changes needed

### Pass/Fail Criteria:
- PASS: A developer can see the skip_change_eval pattern in each file and easily replicate it for skip_functional_eval
- FAIL: The skip_change_eval implementation is inconsistent across files or uses non-obvious patterns
