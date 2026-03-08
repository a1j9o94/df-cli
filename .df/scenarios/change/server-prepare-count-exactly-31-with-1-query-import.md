---
name: server-prepare-count-exactly-31-with-1-query-import
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7XF6W0MA66MHHBCJ5JS3RM
---

VERIFIED FACT: src/dashboard/server.ts has exactly 31 db.prepare() calls (grep -c returns 31). It imports from exactly 1 query module: db/queries/blockers.js. Buildplan query duplicated 5 times. Duplicate case 'spec' at lines 1274 and 1280. Module agent lookup at line 540 DOES include ORDER BY created_at DESC before LIMIT 1. Scenarios claiming 7, 16, 19, or 30 are stale. Scenarios claiming zero query imports are wrong. PASS: grep -c '.prepare(' returns 31 and grep 'db/queries' finds blockers import. FAIL: any other count.