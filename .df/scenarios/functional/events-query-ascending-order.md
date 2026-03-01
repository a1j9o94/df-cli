---
name: events-query-ascending-order
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNBP8YDWBE5G0KK4H7V01R0
---

SCENARIO: The listEvents database query returns events in chronological (ascending) order by default.

PRECONDITIONS:
- Events table has multiple events with different timestamps

STEPS:
1. Insert 5 events with timestamps t1 < t2 < t3 < t4 < t5
2. Call listEvents(db, runId) with no special options
3. Check the returned array ordering

EXPECTED OUTPUTS:
- events[0].created_at <= events[1].created_at <= events[2].created_at ...
- The earliest event is first, the latest event is last
- This matches chronological reading order (timeline)

PASS CRITERIA:
- listEvents returns events in ASC order (oldest first)
- FAIL if events are returned in DESC order (newest first)
- This matters for dashboard event timelines and any API that returns events
- The SQL query should use ORDER BY created_at ASC