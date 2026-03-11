---
name: no-sqlite-needed
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that a full build lifecycle can be monitored without raw sqlite access.

This scenario verifies that ALL information previously requiring sqlite3 .df/state.db is now accessible through CLI commands. This is a comprehensive integration test.

VERIFICATION - Information Completeness:

1. Agent list completeness:
   - formatAgentListEntry output must include: id, name, role, status, elapsed, cost, files changed, module_id
   - Sub-lines must include: worktree path, last heartbeat
   - Verify by creating agent with ALL fields populated and checking output contains each

2. Agent show completeness:
   - formatAgentDetail output must include: id, name, role, status, pid, module, worktree, branch, elapsed, heartbeat, cost, tokens, tdd_phase, tdd_cycles, created_at, updated_at, error, files changed
   - Must include Events section with type and timestamp
   - Must include Messages section with sender, read status, and body

3. Status completeness:
   - formatStatusDetail output must include: run id, spec id with title, status, phase, iteration, cost/budget, tokens, agent breakdown, module progress
   - With --detail: must also include phase timeline, module grid details, evaluation results, cost by role

4. Filtering completeness:
   - dark agent list (default): shows latest per module for latest run
   - dark agent list --active: shows only live agents
   - dark agent list --module <id>: shows latest attempt for that module
   - dark agent list --run-id <id>: scopes to specific run

PASS CRITERIA:
- Every piece of information that was previously only in sqlite is now shown by at least one CLI command
- No field from the agents table is inaccessible through CLI
- Module progress is visible without querying buildplans table directly
- Agent events and mail history are accessible through agent show