---
name: user-resolves-via-dashboard
type: functional
spec_id: run_01KJSYMVWPNRZ16G28KTV8R2VQ
created_by: agt_01KJSYMVWQ923DD7ASGJ6GVV34
---

## User Resolves Blocker via Dashboard

### Preconditions
- Dashboard server is running (dark dash)
- A blocker request exists with status='pending', type='decision'
- The requesting agent is in 'blocked' status

### Steps
1. GET /api/runs/<run-id>/blockers — verify pending blocker appears in response
2. Verify the response includes: agent ID, module ID, blocker type, description, timestamp
3. Verify the dashboard HTML (GET /) contains a yellow banner/card for the blocker
4. POST /api/runs/<run-id>/blockers/<blocker-id>/resolve with body {value: 'OAuth2'}
5. GET /api/runs/<run-id>/blockers — verify blocker now shows status='resolved'
6. Query agent status — should be 'running'

### Expected Results
- GET blockers endpoint returns JSON array with the pending blocker
- Dashboard HTML renders yellow blocker card with description and resolve input
- POST resolve endpoint returns success, blocker status transitions to 'resolved'
- Agent status transitions from 'blocked' to 'running'
- Blocker remains in history (status='resolved') with resolved_at timestamp
- Run resumes if it was paused

### Pass/Fail Criteria
- PASS: Dashboard shows blocker, POST resolves it, agent resumes
- FAIL: Any of: blockers not visible in dashboard, POST fails, agent stays blocked