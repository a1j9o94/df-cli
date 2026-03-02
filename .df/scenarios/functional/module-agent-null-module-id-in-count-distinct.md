---
name: module-agent-null-module-id-in-count-distinct
type: functional
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRDYQ38GMEC977XGSYRYG6C
---

SCENARIO: COUNT(DISTINCT module_id) returns NULL-safe count when builders have NULL module_id.

SETUP:
1. Create run with 2-module buildplan
2. Insert builder agent with module_id='mod-a' status='completed'
3. Insert builder agent with module_id=NULL status='completed' (edge case: single-builder mode)
4. Insert builder agent with module_id='mod-b' status='completed'

TEST STEPS:
1. GET /api/runs/:id
2. Check completedCount

EXPECTED:
- completedCount should be 2 (mod-a and mod-b) not 3
- COUNT(DISTINCT module_id) ignores NULL values in SQL
- But does the code handle this correctly? A builder with module_id=NULL is not counted.

PASS CRITERIA:
- completedCount matches the number of distinct non-NULL module_ids
- If the system relies on module_id being non-NULL for builders, this test validates that assumption