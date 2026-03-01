---
name: polling-interval-three-seconds
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Dashboard auto-polls the API at approximately 3-second intervals

PRECONDITIONS:
- Dashboard server is running
- A run exists in 'running' status

STEPS:
1. Start the dashboard server
2. Load the HTML page
3. Inspect the inline JavaScript for setInterval or setTimeout calls
4. Verify the polling interval is approximately 3000ms (3 seconds)
5. Verify the polling targets /api/runs/:id or /api/runs

EXPECTED OUTPUTS:
- JavaScript contains setInterval or setTimeout with ~3000ms delay
- Polling function calls fetch() to /api/ endpoints
- Polling is active for running runs, can be paused for completed runs

PASS CRITERIA:
- Polling interval is 3000ms (±500ms tolerance)
- FAIL if polling interval is 5000ms or longer (too slow for live tracking)
- FAIL if no auto-polling exists
