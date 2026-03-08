---
name: get-api-logs-returns-last-100
type: functional
spec_id: run_01KK7HZXYXADSN1VSEK10QZFDK
created_by: agt_01KK7HZXYZF7Z4QR9MJPS63D15
---

Test: GET /api/logs returns last 100 logged requests as JSON array.

Setup:
1. Start server with in-memory SQLite DB seeded with test data
2. Make 110 requests to various endpoints (e.g., GET /api/runs, GET /hello, GET /)

Verification:
1. Call GET /api/logs
2. Assert response status is 200
3. Assert Content-Type is application/json
4. Parse response body as JSON array
5. Assert array length is exactly 100 (not 110)
6. Assert the array contains the 100 MOST RECENT requests (not the first 100)
7. Each entry should have: method, path, status, duration, timestamp fields

Pass criteria: Response is a JSON array of exactly 100 entries representing the most recent requests, each with required fields.