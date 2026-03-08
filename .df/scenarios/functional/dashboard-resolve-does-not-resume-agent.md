---
name: dashboard-resolve-does-not-resume-agent
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK774KFJPP60P9ZQQ054NTRT
---

SETUP: Agent blocked with pending blocker. Dashboard server running. STEPS: 1. POST /api/runs/<run-id>/blockers/<blocker-id>/resolve with {value: 'OAuth2'}. 2. Verify blocker status transitions to resolved. 3. Check agent status — it should transition from blocked to running. 4. Check if mail notification was sent to agent. 5. Check if run resumed (if it was paused). EXPECTED: Dashboard resolve handler resumes agent, sends mail, and resumes run — same behavior as CLI resolve. ACTUAL: Dashboard handleResolveBlocker only calls resolveBlocker() to update the blocker record. It does NOT: (a) update agent status to running, (b) send mail notification to agent, (c) check/resume paused run. PASS CRITERIA: Dashboard resolve has parity with CLI resolve for agent/run state transitions. Currently FAILS.