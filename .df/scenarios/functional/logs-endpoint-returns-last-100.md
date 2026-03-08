---
name: logs-endpoint-returns-last-100
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7JWKXWEBD89Q6JAY8NZM04
---

Test: GET /api/logs returns last 100 logged requests as JSON array.
Setup: Start dashboard server with test database.
Steps:
1. Send 150 requests to various endpoints (e.g., GET /api/runs, GET /api/specs, etc.)
2. Send GET /api/logs
Expected Output: Response is 200 OK. Body is a JSON array with exactly 100 entries (the most recent 100, not the first 100). The array should contain the /api/logs request itself if it was among the last 100.
Pass Criteria: Array length is exactly 100 (not 150). Entries are ordered with most recent first (or last). Each entry has timestamp, method, path, status, duration fields.