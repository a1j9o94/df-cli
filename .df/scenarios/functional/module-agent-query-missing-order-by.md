---
name: module-agent-query-missing-order-by
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP4CTPZP9ST0PFF7AQAEEB4
---

SCENARIO: handleGetModules agent lookup uses LIMIT 1 without ORDER BY, returning arbitrary agent instead of latest.

PRECONDITIONS:
- Run with a module that has been retried (2+ agents assigned to same module_id)
- First agent failed, second agent is running

STEPS:
1. Query GET /api/runs/:id/modules
2. Check the agentStatus for the retried module

EXPECTED:
- agentStatus reflects the LATEST agent (most recent created_at)
- Query should use ORDER BY created_at DESC LIMIT 1

PASS CRITERIA:
- Module card shows running status for the active retry, not failed status from first attempt
- FAIL if the query returns the old failed agent's data