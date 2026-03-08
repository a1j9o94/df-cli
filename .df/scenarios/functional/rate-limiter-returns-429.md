---
name: rate-limiter-returns-429
type: functional
spec_id: run_01KK7HZXYXADSN1VSEK10QZFDK
created_by: agt_01KK7HZXYZF7Z4QR9MJPS63D15
---

Test: Rate limiter returns 429 after 100 requests from same IP within 60 seconds.

Setup:
1. Start server with in-memory SQLite DB
2. Send 100 GET requests to /api/runs from the same IP (localhost/127.0.0.1)

Verification:
1. All 100 requests should return status 200 (or appropriate non-429 status)
2. Send request #101 from the same IP
3. Assert response status is 429
4. Assert response body contains JSON with error field: { error: 'Too many requests' }

Pass criteria: First 100 requests succeed, request 101 returns 429 with correct error message.