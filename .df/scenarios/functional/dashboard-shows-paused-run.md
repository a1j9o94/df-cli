---
name: dashboard-shows-paused-run
type: functional
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Dashboard shows paused run

### Preconditions
- A run exists in 'paused' state with pause_reason = 'budget_exceeded'
- Dashboard server is running

### Steps
1. Pause a run (via budget or manual pause)
2. Open the dashboard (dark dash)
3. Select the paused run

### Expected Results
- The run list shows the paused run with a yellow/amber 'Paused' status badge
- The badge uses CSS class 'status-badge paused' which should render with yellow/amber background
- Below the badge, the reason is shown: 'Budget limit reached ($14.87 / $15.00)' (actual amounts)
- An 'Add Budget' action is present (either a button that pre-fills a dark continue command, or a UI form)
- Paused runs are visually distinct from failed runs (NOT grouped with failed runs)
- The run timeline shows the pause event as a milestone marker
- The /api/runs endpoint returns pauseReason and pausedAt fields for paused runs
- The /api/runs/<id> endpoint includes pause-specific data

### Pass Criteria
- GET /api/runs returns a run with status='paused', pauseReason='budget_exceeded', pausedAt=<timestamp>
- GET /api/runs/<id> includes pauseReason and pausedAt
- The dashboard HTML includes the paused badge CSS (already exists: .status-badge.paused with yellow styling)
- The pause reason text is visible in the run detail view
- Failed runs and paused runs are rendered differently (different badge colors: red vs amber)