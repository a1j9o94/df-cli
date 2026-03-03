---
name: engine-propagates-skip-change-eval-to-phases
type: functional
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJSXZQ3K1JDF6R9FW29QF9BZ
---


## Scenario: Engine propagates skip_change_eval from CLI option through to phase skip logic

### Preconditions:
- All source files compile

### Test Steps:
1. Read src/pipeline/engine.ts and verify:
   a. execute() reads options.skipChangeEval (was options.mode)
   b. The skip_change_eval value is passed to createRun input (was mode)
   c. The context object includes skip_change_eval: boolean (was mode: string)
   d. No references to 'quick' or 'thorough' remain
2. Read src/dashboard/server.ts and verify:
   a. handleGetPhases reads run.skip_change_eval (was run.mode)
   b. The skipContext object includes skip_change_eval (was mode)
3. Read src/commands/status.ts and verify:
   a. Status output shows skip_change_eval value (was Mode: quick/thorough)

### Expected:
- Full data flow: CLI --skip-change-eval → engine options → createRun → DB → phases context → shouldSkipPhase
- Dashboard correctly reads and passes skip_change_eval to shouldSkipPhase
- Status command displays the new field

### Pass/Fail Criteria:
- PASS: End-to-end propagation works, no 'quick'/'thorough' references in engine/dashboard/status
- FAIL: Broken propagation chain, or old mode references remain
