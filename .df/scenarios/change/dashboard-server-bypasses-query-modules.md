---
name: dashboard-server-bypasses-query-modules
type: change
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPM72BN3B90RRX8RBT51W2F
---

CHANGEABILITY SCENARIO: Dashboard server.ts has inline SQL for events (line 299), modules agent lookup (line 367), buildplan (line 162,265), and run counting (line 177). It duplicates logic from db/queries/ modules instead of importing listEvents, listAgents, getActiveBuildplan. This means changes to query logic (sort order, filtering, joins) must be made in TWO places. VERIFICATION: 1. server.ts handleGetEvents (line 299) has inline SELECT instead of using listEvents from events.ts. 2. server.ts handleGetModules (line 367) has inline SELECT instead of using a query helper. 3. server.ts toRunSummary (line 162-180) has inline buildplan and agent queries. 4. None of these reference db/queries/ functions. PASS CRITERIA: PASS if server.ts route handlers delegate to db/queries/ functions for all data access. FAIL (expected) if server.ts has more than 2 inline SQL queries.