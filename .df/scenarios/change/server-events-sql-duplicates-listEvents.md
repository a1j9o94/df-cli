---
name: server-events-sql-duplicates-listEvents
type: change
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNCFDB4XCTNP384RQ41KS8V
---

CHANGEABILITY SCENARIO: Server events endpoint duplicates listEvents SQL query

DESCRIPTION:
server.ts line 281 has its own hardcoded SQL 'SELECT * FROM events WHERE run_id = ? ORDER BY created_at DESC, rowid DESC' instead of importing and using listEvents() from src/db/queries/events.ts. This DRY violation means changing listEvents sort order does NOT affect the dashboard API endpoint.

MODIFICATION STEPS:
1. In server.ts handleGetEvents(): import listEvents from db/queries/events.ts
2. Replace inline SQL with listEvents(db, runId) call
3. Map EventRecord to the JSON response shape

AFFECTED AREAS:
- src/dashboard/server.ts — modify handleGetEvents function (~5-10 lines)

EXPECTED EFFORT:
- ~10 lines changed in 1 file
- Eliminates SQL duplication
- Events API sort order will automatically follow listEvents default

VERIFICATION:
1. Dashboard events endpoint returns same data as before
2. Changing listEvents sort order now also affects the API endpoint
3. No hardcoded event SQL remains in server.ts

PASS CRITERIA:
- handleGetEvents uses listEvents() instead of inline SQL
- Only server.ts modified
- DRY violation eliminated