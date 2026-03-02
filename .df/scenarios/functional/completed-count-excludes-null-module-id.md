---
name: completed-count-excludes-null-module-id
type: functional
spec_id: run_01KJRD3EPV1VW55DHXQ5B6EV1A
created_by: agt_01KJRF2AKE3XX8RTG4QZ2K7KXT
---

SCENARIO: COUNT(DISTINCT module_id) should not be inflated by builders with NULL module_id.

SETUP:
1. Create run with 2-module buildplan (mod-a, mod-b)
2. Insert builder: module_id='mod-a', status='completed'
3. Insert builder: module_id=NULL, status='completed' (single-builder mode or edge case)
4. Insert builder: module_id='mod-b', status='completed'

TEST STEPS:
1. GET /api/runs/:id
2. Check completedCount

EXPECTED:
- completedCount should be 2 (only mod-a and mod-b counted)
- SQL COUNT(DISTINCT module_id) ignores NULL values by design
- The NULL-module_id builder is correctly excluded from distinct count

PASS CRITERIA:
- PASS: completedCount = 2 (matching moduleCount)
- FAIL: completedCount includes NULL module_id entries

NOTE: This is a SQL semantics edge case. COUNT(DISTINCT column) does ignore NULLs in standard SQL, but this should be verified with a test.