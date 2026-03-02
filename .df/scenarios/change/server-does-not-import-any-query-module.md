---
name: server-does-not-import-any-query-module
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQGS6G0HH1CJ1PKMW5KN4P7
---

CHANGEABILITY SCENARIO: server.ts has 0 imports from src/db/queries/. It contains 14 inline SELECT statements that duplicate logic from agents.ts, events.ts, buildplans.ts, and runs.ts query modules. Any change to query logic (column names, sort order, filtering) must be duplicated. VERIFICATION: grep 'import.*from.*db/queries' src/dashboard/server.ts — returns nothing. Count SELECT statements in server.ts — returns 14. PASS CRITERIA: PASS if server.ts imports and delegates to db/queries/ functions for ALL data access (0 inline SELECT statements). FAIL (expected) if server.ts has >2 inline SELECT statements.