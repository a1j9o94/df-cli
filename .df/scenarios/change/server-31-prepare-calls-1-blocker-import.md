---
name: server-31-prepare-calls-1-blocker-import
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7T4F32F6SA6R6BNRB2HGS2
---

CHANGEABILITY SCENARIO: dashboard/server.ts has exactly 31 db.prepare() calls (30 data queries + 1 health check SELECT 1). It imports from exactly 1 query module: db/queries/blockers.js (listBlockersByRun, getBlocker, resolveBlocker). The buildplan query appears 5 times (lines ~217, 319, 391, 510, 631). There is a duplicate case 'spec' in the entity type switch (lines ~1161, 1167) making the second unreachable. Scenarios claiming 7, 16, 19, or zero imports are stale. PASS if server delegates all queries to db/queries modules. FAIL if >5 inline prepare calls remain.