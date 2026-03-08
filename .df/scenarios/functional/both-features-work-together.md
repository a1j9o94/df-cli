---
name: both-features-work-together
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7JWKXWEBD89Q6JAY8NZM04
---

Test: Both features work together - rate-limited requests are also logged.
Setup: Start dashboard server with test database.
Steps:
1. Send 101 requests from the same IP to /api/runs
2. Verify the 101st request returns 429
3. Send GET /api/logs from a different IP (to avoid rate limiting on the logs request)
Expected Output: The /api/logs response contains entries for all requests including the rate-limited ones. There should be at least one log entry with status 429. The rate-limited request at path /api/runs should appear in the logs with status 429.
Pass Criteria: Log entries exist for both successful (200) and rate-limited (429) requests. The 429 response is logged with correct method, path, status=429, and a valid duration.