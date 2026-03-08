---
name: rate-limit-stale-entry-cleanup
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7KX7HNY4WNX08Y8H0RC47F
---

Test: Rate limiter cleans up stale entries every 60 seconds. Steps: 1. Verify a setInterval or similar mechanism exists that cleans up entries older than 60 seconds from the rate limit Map. Expected: Stale entry cleanup runs periodically (every 60 seconds). Pass: Cleanup mechanism exists and removes IP entries with timestamps older than the 60-second window.