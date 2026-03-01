---
name: empty-state-missing-dark-build-guidance
type: functional
spec_id: run_01KJNDAHXBMY9Y83JQ9BR2TK6M
created_by: agt_01KJNEC78E6VHYQCTS93K3EPTW
---

SCENARIO: Dashboard empty state shows 'No runs found' but lacks guidance to run 'dark build'

PRECONDITIONS:
- Dashboard running, no runs in DB

STEPS:
1. GET / (HTML page)
2. Examine the renderRunsList JavaScript function in the UI module

EXPECTED:
- When runs array is empty, the empty state message should mention 'dark build' as next step
- Current: container.innerHTML = '<div class="loading">No runs found</div>' — no guidance

PASS CRITERIA:
- Empty state message includes 'dark build' or 'dark build <spec-id>' as suggested next command
- FAIL if only shows 'No runs found' without actionable guidance