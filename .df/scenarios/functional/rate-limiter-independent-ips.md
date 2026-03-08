---
name: rate-limiter-independent-ips
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7JWKXWEBD89Q6JAY8NZM04
---

Test: Rate limiter allows requests from different IPs independently.
Setup: Start dashboard server with test database.
Steps:
1. Send 99 requests from IP 10.0.0.1 (should all succeed)
2. Send 99 requests from IP 10.0.0.2 (should all succeed)
3. Send 1 more request from IP 10.0.0.1 (request #100, should succeed - at limit)
4. Send 1 more request from IP 10.0.0.2 (request #100, should succeed - at limit)
5. Send 1 more request from IP 10.0.0.1 (request #101, should get 429)
6. Send 1 more request from IP 10.0.0.2 (request #101, should get 429)
Expected Output: Steps 1-4 return 200. Steps 5-6 return 429.
Pass Criteria: Rate limiting is tracked per-IP, not globally. Each IP gets its own 100-request-per-minute window.