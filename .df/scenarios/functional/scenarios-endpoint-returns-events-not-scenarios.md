---
name: scenarios-endpoint-returns-events-not-scenarios
type: functional
spec_id: run_01KJNDAHXBMY9Y83JQ9BR2TK6M
created_by: agt_01KJNEC78E6VHYQCTS93K3EPTW
---

SCENARIO: /api/runs/:id/scenarios returns raw evaluation events instead of structured scenario results

PRECONDITIONS:
- Dashboard server running, run with evaluation events

STEPS:
1. GET /api/runs/:id/scenarios
2. Check response shape

EXPECTED:
- Each element should have: name (string matching scenario filename), type (functional|change), result (pass|fail|pending)
- Current response returns: id, type (event type like 'evaluation-started'), data, createdAt — wrong shape entirely

PASS CRITERIA:
- Response is array of {name, type: 'functional'|'change', result: 'pass'|'fail'|'pending'}
- FAIL if endpoint returns raw events with event types instead of scenario-structured results