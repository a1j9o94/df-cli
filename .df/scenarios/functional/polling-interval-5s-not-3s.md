---
name: polling-interval-5s-not-3s
type: functional
spec_id: run_01KJNDAHXBMY9Y83JQ9BR2TK6M
created_by: agt_01KJNEC78E6VHYQCTS93K3EPTW
---

SCENARIO: Dashboard polling interval is 5000ms instead of required 3000ms

PRECONDITIONS:
- Dashboard UI module

STEPS:
1. Read src/dashboard/index.ts
2. Find REFRESH_INTERVAL constant

EXPECTED:
- REFRESH_INTERVAL should be 3000 (3 seconds) for responsive live tracking
- Current: REFRESH_INTERVAL = 5000 at line 474 of index.ts

PASS CRITERIA:
- setInterval uses approximately 3000ms (±500ms tolerance: 2500-3500)
- FAIL if interval is 5000ms or longer