---
name: failed-run-diagnosis
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: Dashboard correctly displays a failed run with failed phase highlighted red and error message visible.

Preconditions:
- A run exists with status='failed', error field populated, current_phase set to the phase that failed (e.g., 'build')
- At least one agent has status='failed' with an error message
- Prior phases (scout, architect) have completed agents
- Events track the failure

Setup (DB seed):
- INSERT run with status='failed', error='Builder agent timed out', current_phase='build', cost_usd=2.30
- INSERT architect agent with status='completed'
- INSERT builder agent with status='failed', error='Process exited with code 1: timeout after 300s'
- INSERT events: phase_started(scout), phase_completed(scout), phase_started(architect), phase_completed(architect), phase_started(build), agent_failed(builder), phase_failed(build)

Steps:
1. Start dashboard server
2. GET /api/runs/:id — verify status='failed' and error field is non-null
3. GET /api/runs/:id/agents — verify the failed agent has error message
4. GET /api/runs/:id/events — verify the failure event is present with details
5. Verify the HTML Phase Bar shows: completed phases in green, failed phase in red, subsequent phases in gray/pending
6. Verify the error message from the failed agent is accessible in the dashboard output

Expected Outputs:
- /api/runs/:id returns { status: 'failed', error: 'Builder agent timed out', phase: 'build' }
- /api/runs/:id/agents includes at least one agent with status='failed' and non-empty error
- /api/runs/:id/events includes failure event with phase and error context
- HTML renders 'build' phase as failed/red state
- HTML renders phases after 'build' (integrate, evaluate, merge) as pending/gray
- HTML renders phases before 'build' (scout, architect, plan-review) as completed/green
- Error message text is present somewhere in the rendered HTML or API response

Pass/Fail Criteria:
- PASS if failed phase is clearly distinguished (red), error is visible, and timeline shows failure context
- FAIL if failed phase looks same as pending, or error message is not accessible