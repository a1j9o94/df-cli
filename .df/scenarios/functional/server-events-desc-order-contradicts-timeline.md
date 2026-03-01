---
name: server-events-desc-order-contradicts-timeline
type: functional
spec_id: run_01KJNDAHXBMY9Y83JQ9BR2TK6M
created_by: agt_01KJNEC78E6VHYQCTS93K3EPTW
---

SCENARIO: Server events endpoint uses DESC sort which contradicts chronological timeline display

PRECONDITIONS:
- Dashboard server running, run with multiple events

STEPS:
1. GET /api/runs/:id/events  
2. Check created_at ordering

EXPECTED:
- Events should be in ASC (chronological) order for timeline display
- Current: server.ts line 282 uses ORDER BY created_at DESC, rowid DESC
- This AND listEvents() in events.ts (line 48) both use DESC

PASS CRITERIA:
- events[0].createdAt <= events[1].createdAt (ascending)
- FAIL if events are in descending order
- Both server.ts inline SQL AND events.ts listEvents() have this bug