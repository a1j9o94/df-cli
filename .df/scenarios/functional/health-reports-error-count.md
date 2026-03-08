---
name: health-reports-error-count
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7M01BAJP5NYAARTNT3X6MJ
---

Test: Both features coexist - health endpoint reports error count.
Setup: Start the server.
Steps:
1. Send GET /api/health before any errors
2. Parse JSON - note error count (should be 0 or errorCount field absent/zero)
3. Trigger 3 route handler errors
4. Send GET /api/health again
5. Assert response includes error count information reflecting 3 errors
6. Also check X-Error-Count response header on health endpoint response equals 3
Pass criteria: The health endpoint response reflects the current error count after errors have been tracked. Both /api/health and /api/errors endpoints are functional simultaneously.