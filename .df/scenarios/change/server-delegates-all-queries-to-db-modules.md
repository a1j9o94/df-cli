---
name: server-delegates-all-queries-to-db-modules
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify server.ts delegates ALL data access to db/queries/ modules instead of using inline SQL. PASS if server.ts has zero db.prepare() calls for data queries (CORS/health excluded) and imports functions from db/queries/. FAIL if server.ts contains any SELECT statements via db.prepare().