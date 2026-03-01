---
name: from-phase-cli-validation
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNC3VME1YR7HSH2CQYPM6EX
---

CHANGEABILITY SCENARIO: Add CLI-level validation for --from-phase flag

DESCRIPTION:
Currently --from-phase accepts any string at the CLI level and only validates at engine level (engine.ts:200-202). A fresh builder should add Commander validation in continue.ts that rejects invalid phase names BEFORE reaching the engine.

MODIFICATION STEPS:
1. Import PHASE_ORDER from phases.ts in continue.ts
2. Add a .choices() or manual validation after parsing --from-phase
3. If the phase name is not in PHASE_ORDER, print all valid phases and exit

AFFECTED AREAS:
- src/commands/continue.ts — add validation after option parsing (~5 lines)

EXPECTED EFFORT:
- ~5 lines of code in 1 file
- No engine changes needed

VERIFICATION:
1. dark continue --from-phase invalid-name should print valid phases and exit before engine starts
2. dark continue --from-phase build should still work normally
3. Error message should list all valid phase names

PASS CRITERIA:
- Invalid phase name rejected at CLI level, not engine level
- Error message includes list of valid phase names
- No changes to engine.ts needed