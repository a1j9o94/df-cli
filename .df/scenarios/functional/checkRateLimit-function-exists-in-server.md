---
name: checkRateLimit-function-exists-in-server
type: functional
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7KX7HNY4WNX08Y8H0RC47F
---

Test: checkRateLimit() function exists in src/dashboard/server.ts. Steps: 1. Read src/dashboard/server.ts. 2. Search for function named checkRateLimit. Expected: Function exists, uses in-memory Map with IP keys and timestamp arrays. Pass: Function is defined and implements per-IP rate limiting with 100 req/min threshold.