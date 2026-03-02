---
name: events-endpoint-and-query-both-desc-prevents-timeline-fix
type: change
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ61PK9FQEVPTC780QYZBRS
---

CHANGEABILITY SCENARIO: Fixing events display to show chronological order requires changes in TWO files instead of one. PROBLEM: server.ts handleGetEvents (line 299) has inline SQL 'ORDER BY created_at DESC' AND events.ts listEvents (line 48) has 'ORDER BY created_at DESC'. These are duplicate sort clauses. If a developer fixes one, the timeline may still be backwards because the other retains DESC. EXPECTED: server.ts should call listEvents() instead of duplicating SQL, so fixing sort order requires changing only events.ts. AFFECTED: src/db/queries/events.ts line 48, src/dashboard/server.ts line 299. EFFORT: 2 files, ~5 lines changed. Would be 1 file if DRY.