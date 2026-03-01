---
name: add-new-api-endpoint
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Changeability Test: Adding a new /api/runs/:id/messages endpoint.

Modification Description:
Add a new API endpoint GET /api/runs/:id/messages that returns all messages for a given run from the messages table.

Expected Approach:
1. In src/dashboard/server.ts: Add a new route handler for GET /api/runs/:id/messages
2. The handler should query the messages table: SELECT * FROM messages WHERE run_id = ? ORDER BY created_at
3. Return the results as JSON array

What Should NOT Need Changing:
- src/dashboard/ui.ts — The UI template should NOT require modification. The API is consumed by fetch() calls in the HTML template, and adding a new endpoint should not break existing UI.
- src/commands/dash.ts — The CLI command should not need changes.
- No schema changes needed (messages table already exists).
- No new dependencies needed.

Affected Areas:
- src/dashboard/server.ts — ONE new route handler function + ONE new route registration
- Optionally src/db/queries/messages.ts — may reuse existing listMessages() or add a thin wrapper

Expected Effort:
- ~10-20 lines of code in server.ts
- 0 lines in ui.ts
- 0 lines in dash.ts
- Total: < 30 minutes of work

Pass/Fail Criteria:
- PASS if adding the endpoint requires ONLY changes to server.ts (and optionally a query helper), with NO changes to ui.ts or dash.ts
- FAIL if the server architecture requires touching multiple files, or if the UI template must be modified to accommodate a new API endpoint