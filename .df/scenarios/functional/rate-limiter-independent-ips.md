---
name: rate-limiter-independent-ips
type: functional
spec_id: run_01KK7HZXYXADSN1VSEK10QZFDK
created_by: agt_01KK7HZXYZF7Z4QR9MJPS63D15
---

Test: Rate limiter allows requests from different IPs independently.

Setup:
1. Start server with in-memory SQLite DB
2. Send 100 GET requests from IP A (e.g., via X-Forwarded-For: 10.0.0.1)
3. IP A has now exhausted its rate limit

Verification:
1. Send a request from IP B (e.g., via X-Forwarded-For: 10.0.0.2)
2. Assert IP B request returns status 200 (not 429)
3. Send request #101 from IP A
4. Assert IP A request returns 429

Pass criteria: Different IPs have independent rate limit counters. IP B is unaffected by IP A exhausting its limit.