---
name: completed-count-uses-count-star-not-distinct
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: completedCount in RunSummary uses COUNT(*) instead of COUNT(DISTINCT module_id)

PRECONDITIONS:
- A run with 3 modules
- One module has 2 completed builder agents (original + retry both completed)

STEPS:
1. Insert run with buildplan having 3 modules
2. Insert 4 builder agents: mod-a completed, mod-b completed, mod-c failed then retried and completed
3. GET /api/runs/:id

EXPECTED:
- completedCount should be 3 (distinct modules)
- Current code returns 4 (COUNT of completed builders, not distinct modules)

PASS CRITERIA:
- completedCount equals number of distinct module_ids with completed builders
- FAIL if completedCount can exceed moduleCount