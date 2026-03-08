---
name: both-features-work-together
type: functional
spec_id: run_01KK7HZXYXADSN1VSEK10QZFDK
created_by: agt_01KK7HZXYZF7Z4QR9MJPS63D15
---

Test: Both features work together - rate-limited requests are also logged.

Setup:
1. Start server with in-memory SQLite DB
2. Send 101 requests from same IP to GET /api/runs

Verification:
1. Request #101 should return 429 (rate limited)
2. Call GET /api/logs from a different IP (to avoid rate limiting the log check)
3. Parse the JSON array response
4. Find the log entry for the 429 response
5. Assert there is a log entry with: method='GET', path='/api/runs', status=429
6. Assert that both successful (200) and rate-limited (429) requests appear in logs

Pass criteria: Rate-limited requests (429 responses) are logged just like normal requests, with correct status code recorded.