---
name: add-new-agent-command-gets-cost-tracking
type: change
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# Adding a New Agent Command Automatically Gets Cost Tracking

## Modification Description
A developer adds a new command `dark agent pause <agent-id>` (hypothetical). The question is: how much effort is required to add cost tracking to this new command?

## Expected Effort
One line of code added to the new command's action handler:
```typescript
import { estimateAndRecordCost } from '../../pipeline/budget.js';
// ... inside action handler, after agent lookup:
estimateAndRecordCost(db, agentId);
```

## Affected Areas
- Only the new command file (e.g., `src/commands/agent/pause.ts`)
- No changes needed to budget.ts, engine.ts, or any other existing file
- The helper is a standalone function that encapsulates all cost estimation logic

## Verification
1. Check that `estimateAndRecordCost` is exported from `src/pipeline/budget.ts` (or `budget.js`)
2. Check that the function signature is `(db: SqliteDb, agentId: string) => number`
3. Check that calling it requires only the db handle and agent ID — no other context (no run_id lookup, no timestamp computation, no config access)
4. The function should internally handle: agent lookup, timestamp comparison, cost computation, DB update, and returning the new total

## Pass/Fail Criteria
- PASS: Adding cost tracking to a new command requires exactly 1 import + 1 function call (2 lines of code)
- FAIL: Adding cost tracking requires passing additional parameters, looking up run_id manually, computing timestamps, or modifying other files