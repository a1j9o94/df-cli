---
name: logging-captures-request-details
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7JWKXWEBD89Q6JAY8NZM04
---

Test: Request logging captures method, path, status, and duration for GET /api/runs.
Setup: Start dashboard server with test database containing at least one run.
Steps:
1. Send GET /api/runs to the server
2. Send GET /api/logs to retrieve logged requests
Expected Output: Response from /api/logs is 200 OK with JSON array. Array contains at least one entry with fields: timestamp (ISO string), method ('GET'), path ('/api/runs'), status (200), duration (number >= 0).
Pass Criteria: All five fields present and correctly typed. method is 'GET', path is '/api/runs', status is 200, duration is a non-negative number, timestamp is a valid ISO date string.