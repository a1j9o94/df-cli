---
name: add-messages-query-for-run
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNC3VME1YR7HSH2CQYPM6EX
---

CHANGEABILITY SCENARIO: Add listMessagesForRun() query function

DESCRIPTION:
The messages.ts query module has getMessagesForAgent() and getMessagesForRole() but no way to get all messages for a run by run_id. A fresh builder should add a listMessagesForRun() function.

MODIFICATION STEPS:
1. In src/db/queries/messages.ts: Add listMessagesForRun(db, runId) function
2. Query: SELECT * FROM messages WHERE run_id = ? ORDER BY created_at ASC
3. Return MessageRecord[]

AFFECTED AREAS:
- src/db/queries/messages.ts — ONE new function (~10 lines)

EXPECTED EFFORT:
- ~10 lines in 1 file
- No schema changes
- No new files

VERIFICATION:
1. Function returns all messages for a given run_id
2. Messages ordered chronologically (ASC)
3. Existing functions unchanged

PASS CRITERIA:
- PASS if change requires ONLY adding a function to messages.ts
- FAIL if other files need modification
- Total diff under 15 lines