---
name: dashboard-api-json-valid
type: functional
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## Dashboard API JSON Validity

### Preconditions
- A Dark Factory project is initialized with data (runs, agents with system_prompt, events, buildplans)
- Dashboard server can be started

### Setup Steps
1. Start the dashboard server on a test port
2. Ensure the DB has at least one run with agents that have system_prompt containing control chars

### Test Execution
Test each dashboard API endpoint:

1. GET /api/runs | validate JSON
2. GET /api/runs/<run-id> | validate JSON
3. GET /api/runs/<run-id>/agents | validate JSON
4. GET /api/runs/<run-id>/events | validate JSON
5. GET /api/runs/<run-id>/buildplan | validate JSON
6. GET /api/runs/<run-id>/scenarios | validate JSON
7. GET /api/runs/<run-id>/modules | validate JSON

### Expected Output
- All endpoints return valid JSON (Content-Type: application/json)
- All responses parseable by JSON.parse() and Python json.loads()
- The /agents endpoint specifically does NOT include system_prompt (this was already the case but verify it stays that way)

### Additional Validation
- The dashboard server's jsonResponse() function must produce valid JSON for any input data, including data with control characters
- Event data field (which is parsed from JSON in DB) must also be properly handled

### Pass/Fail Criteria
- PASS: All API endpoints return valid JSON for all data, including data with control characters
- FAIL: Any endpoint returns invalid JSON