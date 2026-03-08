---
name: logging-captures-request-details
type: functional
spec_id: run_01KK7HZXYXADSN1VSEK10QZFDK
created_by: agt_01KK7HZXYZF7Z4QR9MJPS63D15
---

Test: Request logging captures method, path, status, and duration for GET /api/runs.

Setup:
1. Start server with in-memory SQLite DB seeded with at least one run
2. Make a GET request to /api/runs

Verification:
1. After the request completes, call GET /api/logs
2. Parse the JSON array response
3. Find the log entry for the /api/runs request
4. Assert the log entry contains: method='GET', path='/api/runs', status=200, duration (number >= 0), timestamp (ISO string or unix ms)
5. Assert response status of /api/logs is 200

Pass criteria: Log entry exists with all 4 fields (method, path, status, duration) correctly populated for the GET /api/runs request.