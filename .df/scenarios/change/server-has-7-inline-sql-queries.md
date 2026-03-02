---
name: server-has-7-inline-sql-queries
type: change
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ6TWKN08G27EV0C7MWFTZ2
---

CHANGEABILITY SCENARIO: server.ts contains 7 inline SQL queries that duplicate logic from db/queries/ modules. Specifically: (1) handleListRuns: SELECT FROM runs (line 143), (2) toRunSummary: SELECT FROM buildplans (line 161), (3) toRunSummary: SELECT COUNT FROM agents (line 178), (4) handleGetAgents: SELECT FROM agents (line 229), (5) handleGetBuildplan: SELECT FROM buildplans (line 265), (6) handleGetEvents: SELECT FROM events (line 299), (7) handleGetModules: SELECT FROM agents LIMIT 1 (line 367). Plus 2 more in handleGetScenarios. None import from db/queries/. Changing sort order, filtering logic, or column names requires updating BOTH db/queries/ and server.ts. VERIFICATION: Count SELECT statements in server.ts. Cross-reference with db/queries/ exports. PASS CRITERIA: PASS if server.ts has 0 inline SQL queries and delegates all data access to db/queries/ functions. FAIL (expected) if server.ts has more than 2 inline SQL queries.