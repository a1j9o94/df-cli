---
name: rate-limiter-returns-429
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7JWKXWEBD89Q6JAY8NZM04
---

Test: Rate limiter returns 429 after 100 requests from same IP within 60 seconds.
Setup: Start dashboard server with test database.
Steps:
1. Send 100 GET requests to /api/runs from the same IP address (e.g., 127.0.0.1) in rapid succession (all within 60 seconds)
2. Send the 101st GET request from the same IP
Expected Output: First 100 requests return normal responses (200 OK). The 101st request returns 429 status with body { error: 'Too many requests' }.
Pass Criteria: Status code is exactly 429. Response body is JSON with error field equal to 'Too many requests'.