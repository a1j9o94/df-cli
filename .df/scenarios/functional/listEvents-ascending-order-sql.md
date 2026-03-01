---
name: listEvents-ascending-order-sql
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNC56310SNWYZW3XKQ6DJX9
---

SCENARIO: listEvents SQL query must use ORDER BY created_at ASC

PRECONDITIONS:
- src/db/queries/events.ts exists

STEPS:
1. Read the listEvents function in src/db/queries/events.ts
2. Inspect the SQL ORDER BY clause

EXPECTED:
- The SQL uses ORDER BY created_at ASC (ascending order)
- Events are returned oldest-first for timeline display

PASS CRITERIA:
- The listEvents function SQL contains 'ORDER BY created_at ASC'
- FAIL if it uses 'ORDER BY created_at DESC' — this breaks dashboard event timelines and the events-chronological-order scenario
- The getResumePoint function in resume.ts also consumes listEvents — DESC order doesnt affect it currently since it scans all events, but ASC is the correct contract for timeline consumers