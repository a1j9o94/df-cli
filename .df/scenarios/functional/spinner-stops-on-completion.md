---
name: spinner-stops-on-completion
type: functional
spec_id: run_01KJNFM38M9TN3Y79CGKB55ZBY
created_by: agt_01KJNFM38P9V22778TGNHSPE8M
---

## Spinner Stops on Agent Completion

### Preconditions
- A pipeline run is active with at least one agent in 'running' status showing an animated spinner
- Dashboard is open and displaying the active run's agents

### Test Steps
1. Observe a running agent card with active spinner
2. Wait for the agent to complete its work (status changes to 'completed')
3. Observe the agent card after status transition
4. Also verify the behavior for a failed agent (status 'failed')

### Expected Results
- When agent status changes from 'running' to 'completed':
  - The animated spinner STOPS and is no longer rendered
  - A static checkmark indicator (✓ or similar) replaces the spinner
  - The checkmark uses green color (var(--accent-green)) consistent with completed status
  - The element should have class 'agent-status-icon completed'
- When agent status changes from 'running' to 'failed':
  - The animated spinner STOPS and is no longer rendered
  - A static X indicator (✗ or similar) replaces the spinner
  - The X uses red color (var(--accent-red)) consistent with failed status
  - The element should have class 'agent-status-icon failed'
- The status badge text still shows 'completed' or 'failed' as before
- No residual animation CSS is applied to completed/failed agent cards

### Pass/Fail Criteria
- PASS: Spinner replaced by static checkmark (completed) or X (failed), no residual animation
- FAIL: Spinner persists after completion, no indicator shown, or wrong indicator for state