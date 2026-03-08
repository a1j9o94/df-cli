---
name: server-30-inline-prepare-calls
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NRZ2KMXYSHE6YA1PV0PC9
---

CHANGE SCENARIO: dashboard/server.ts has 30 inline db.prepare() calls with zero imports from db/queries/. Previous scenarios claimed 7, 14, 16, or 19 - all wrong. Actual count is 30. PASS CRITERIA: server.ts delegates all queries to db/queries/ modules with 0 inline prepare calls. FAIL CRITERIA: server.ts has 30+ inline SQL queries duplicating logic from db/queries/.