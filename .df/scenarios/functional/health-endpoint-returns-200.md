---
name: health-endpoint-returns-200
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7M01BAJP5NYAARTNT3X6MJ
---

Test: GET /api/health returns 200 with required fields.
Setup: Start the server with a valid DB connection.
Steps:
1. Send GET request to /api/health
2. Assert response status is 200
3. Assert response Content-Type is application/json
4. Parse JSON body
5. Assert body contains 'uptime' field (number, >= 0, in seconds)
6. Assert body contains 'memoryUsage' field (number, in MB)
7. Assert body contains 'status' field (string, either 'healthy' or 'degraded')
8. Assert body contains 'dbConnected' field (boolean)
9. Assert body contains 'version' field (string, matches package.json version '0.1.0')
Pass criteria: All assertions pass. Response is valid JSON with all required fields.