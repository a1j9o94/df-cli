---
name: health-db-connected-true
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7M01BAJP5NYAARTNT3X6MJ
---

Test: GET /api/health shows dbConnected=true when DB is accessible.
Setup: Start the server with a valid SQLite DB (in-memory or file-based).
Steps:
1. Send GET request to /api/health
2. Parse JSON body
3. Assert body.dbConnected === true
Pass criteria: dbConnected is true when the database is properly initialized and accessible.