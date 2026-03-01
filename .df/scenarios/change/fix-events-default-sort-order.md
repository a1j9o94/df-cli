---
name: fix-events-default-sort-order
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNC3VME1YR7HSH2CQYPM6EX
---

CHANGEABILITY SCENARIO: Fix listEvents default sort order from DESC to ASC

DESCRIPTION:
listEvents() in src/db/queries/events.ts sorts by 'created_at DESC, rowid DESC'. Dashboard and API consumers expect chronological (ascending) order. A fresh builder should change the default to ASC.

MODIFICATION STEPS:
1. In src/db/queries/events.ts, change ORDER BY created_at DESC to ORDER BY created_at ASC
2. Also change rowid DESC to rowid ASC
3. Optionally add an 'order' parameter to listEvents for flexibility

AFFECTED AREAS:
- src/db/queries/events.ts — 1 line change in listEvents()

EXPECTED EFFORT:
- 1 line changed in 1 file

VERIFICATION:
1. listEvents returns events oldest-first by default
2. getLatestEvent still works (it has its own ORDER BY DESC)
3. getResumePoint still works (it calls listEvents with type filter)

PASS CRITERIA:
- listEvents default order is ASC (oldest first)
- getLatestEvent unchanged (still DESC)
- getResumePoint behavior unchanged (scans for missing phases, order-independent)
- Only events.ts modified, 1 line changed