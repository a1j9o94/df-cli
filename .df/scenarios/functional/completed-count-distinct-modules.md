---
name: completed-count-distinct-modules
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP4CTPZP9ST0PFF7AQAEEB4
---

SCENARIO: completedCount should use COUNT(DISTINCT module_id) not COUNT(*)

PRECONDITIONS:
- Run with a module that was retried (failed builder + successful retry builder for same module_id)
- Both builders have status=completed (one succeeded, one was marked completed earlier)

STEPS:
1. Query GET /api/runs/:id (RunSummary)
2. Compare completedCount vs moduleCount

EXPECTED:
- completedCount should equal the number of distinct completed modules, not the number of completed builder agents
- If 3 modules exist and 2 are completed (one had a retry), completedCount=2 not 3

PASS CRITERIA:
- completedCount <= moduleCount always
- FAIL if completedCount can exceed moduleCount due to retried modules