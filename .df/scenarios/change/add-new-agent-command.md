---
name: add-new-agent-command
type: change
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

CHANGE SCENARIO: Adding a new `dark agent <subcommand>` should automatically get cost tracking by calling the shared helper — one line of code.

MODIFICATION:
A developer needs to add a new command `dark agent pause <id>` that pauses an agent.

EXPECTED EFFORT:
- Add 1 import line: import { estimateAndRecordCost } from '../../pipeline/budget.js'
- Add 1 function call: estimateAndRecordCost(db, agentId) after validating the agent exists
- Total: 2 lines of code to get automatic cost tracking

AFFECTED AREAS:
- New file: src/commands/agent/pause.ts
- No changes needed to budget.ts, agent-lifecycle.ts, build-phase.ts, or any other file

VERIFICATION:
1. Create a new command file src/commands/agent/pause.ts following the pattern of heartbeat.ts
2. Import estimateAndRecordCost from ../../pipeline/budget.js
3. Call estimateAndRecordCost(db, agentId) inside the action handler
4. The new command now tracks cost automatically

PASS CRITERIA:
- estimateAndRecordCost is exported from src/pipeline/budget.ts
- The function signature is estimateAndRecordCost(db: SqliteDb, agentId: string): number
- Adding cost tracking to a new command requires exactly 2 lines (1 import + 1 call)
- No other files need modification

FAIL CRITERIA:
- The helper function is not exported or doesn't exist in budget.ts
- Cost tracking requires modifying engine files (agent-lifecycle.ts, build-phase.ts)
- Cost tracking requires more than 2 lines of code in the new command