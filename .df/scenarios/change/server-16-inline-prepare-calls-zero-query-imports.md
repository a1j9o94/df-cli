---
name: server-16-inline-prepare-calls-zero-query-imports
type: change
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJT3FHY2TEZNJCJVRPW3W1QS
---

CHANGEABILITY SCENARIO: server.ts has 16 inline db.prepare() calls and imports ZERO functions from db/queries/ modules. All data access is done through raw SQL strings. Adding a column, changing sort order, or fixing a query requires editing server.ts AND the corresponding db/queries/ file. VERIFICATION: grep -c '.prepare(' src/dashboard/server.ts returns 16. grep 'from.*db/queries' src/dashboard/server.ts returns nothing. PASS CRITERIA: PASS if server.ts has fewer than 5 inline SQL queries and delegates most data access to db/queries/ functions. FAIL if server.ts has 10+ inline prepare calls.