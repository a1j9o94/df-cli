---
name: errors-stored-after-throw
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7M01BAJP5NYAARTNT3X6MJ
---

Test: GET /api/errors returns stored errors after a route handler throws.
Setup: Start the server.
Steps:
1. Trigger a route handler error (e.g., request that causes an unhandled exception)
2. Send GET /api/errors
3. Assert response status is 200
4. Parse JSON body
5. Assert array has at least 1 entry
6. Assert the entry has fields: timestamp, path, method, error, stack
7. Assert path matches the path of the failing request
8. Assert method matches the HTTP method used
Pass criteria: Error is stored with correct metadata matching the failed request.