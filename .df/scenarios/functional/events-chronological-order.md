---
name: events-chronological-order
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Events API returns events in chronological (ascending) order

PRECONDITIONS:
- A run exists with multiple events at different timestamps

STEPS:
1. Start dashboard server
2. GET /api/runs/:id/events
3. Parse the returned JSON array
4. Check that events are ordered by created_at ASCENDING (earliest first)
5. Verify the first event is the earliest (e.g., run-created) and the last event is the most recent

EXPECTED OUTPUTS:
- events[0].createdAt <= events[1].createdAt <= ... <= events[N].createdAt
- The event timeline reads chronologically from top to bottom

PASS CRITERIA:
- Events array is sorted by created_at in ascending order
- FAIL if events are in descending order (newest first)
