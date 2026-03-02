---
name: completed-module-count-accurate
type: functional
spec_id: run_01KJNH14DGMNSTJH5EJVY17TQ9
created_by: agt_01KJNH14DHP9J33BQJ5KW6S6ZM
---

Test: After continue, completed builder count reflects distinct modules completed, not total completed agent rows.

SETUP:
1. Create in-memory SQLite DB with schema
2. Insert a run (run_r2) in status 'running', current_phase 'build'
3. Insert a buildplan with 3 modules: mod-a, mod-b, mod-c
4. For mod-a: Insert 1 builder agent, status='completed', created_at='2026-03-01T11:00:00Z'
5. For mod-b: Insert 1 builder agent, status='completed', created_at='2026-03-01T11:00:00Z'
6. For mod-c: Insert FIRST builder agent, status='failed', created_at='2026-03-01T11:00:00Z'
7. For mod-c: Insert SECOND builder agent (retry), status='completed', created_at='2026-03-01T11:15:00Z'
   (Total: 4 builder agents with status='completed' across 3 distinct module_ids)

TEST STEPS:
1. GET /api/runs (or GET /api/runs/{run_r2})
2. Parse JSON response
3. Find run_r2 in results

EXPECTED:
- run_r2.moduleCount = 3
- run_r2.completedCount = 3 (distinct modules with at least one completed agent)
- completedCount MUST NOT be 4 (which would be the raw COUNT of completed builder agents)

PASS CRITERIA:
- completedCount == 3 → PASS
- completedCount == 4 → FAIL (stale agent double-counted)
- completedCount > moduleCount → FAIL (inflated count)