---
name: completed-module-count-accurate
type: functional
spec_id: run_01KJRD336D6QVSH0Z3P60Y3QA3
created_by: agt_01KJRD336E2WR8VT2VHPW6XR1E
---

SCENARIO: Completed module count is accurate on continued runs (no inflation from duplicate agents).

SETUP:
1. Create an in-memory SQLite DB with schema
2. Insert a run (id='run_cnt1', status='running', phase='build')
3. Insert a buildplan with 3 modules: 'mod-X', 'mod-Y', 'mod-Z'
4. Insert agents:
   - mod-X: agent1 status='completed', created_at='2026-03-01T11:00:00Z' (first attempt, succeeded)
   - mod-Y: agent2 status='completed', created_at='2026-03-01T11:00:00Z' (first attempt, succeeded)
   - mod-Z: agent3 status='failed', created_at='2026-03-01T11:00:00Z' (first attempt, FAILED)
   - mod-Z: agent4 status='completed', created_at='2026-03-01T12:00:00Z' (retry, succeeded)
5. Start dashboard server

TEST STEPS:
1. GET /api/runs (list all runs)
2. Parse JSON, find run with id='run_cnt1'
3. Check completedCount field

EXPECTED:
- completedCount === 3 (3 unique modules completed: mod-X, mod-Y, mod-Z)
- moduleCount === 3

PASS CRITERIA:
- completedCount must be exactly 3, NOT 4
- If completedCount is 4, it means the old bug is counting BOTH the first completed agents AND the retry agent for mod-Z (counts agent1 + agent2 + agent3-fail-doesnt-count + agent4 = wait, agent3 failed so it wouldnt count)

CORRECTED SCENARIO:
- mod-X: agent1 status='completed' (attempt 1)
- mod-X: agent1b status='completed' (attempt 2, after continue - e.g. run was continued even though mod-X already succeeded)
- mod-Y: agent2 status='completed' (attempt 1)
- mod-Z: agent3 status='completed' (attempt 1)

Actually the more realistic scenario per the spec:
- mod-X: agent1 status='completed', created_at T1
- mod-Y: agent2 status='completed', created_at T1
- mod-Z: agent3 status='failed', created_at T1 (builder failed)
  After dark continue:
- mod-Z: agent4 status='completed', created_at T2 (retry succeeded)

Total completed agents: 3 (agent1, agent2, agent4). COUNT(*) would return 3 which is correct.

BETTER scenario to expose the bug - what if a module was successfully completed twice:
- mod-X: agent1 status='completed', created_at T1
- mod-Y: agent2 status='completed', created_at T1  
- mod-Z: agent3 status='failed', created_at T1
  After dark continue (rebuilds all failed modules, but what if there is a stale completed agent and a re-completed one?):
Actually the spec says: 'If the same module was built twice (old failed, new completed)' - this means COUNT(*) where status=completed counts correctly because the old one was failed not completed. The real issue is if somehow both are completed.

REVISED SETUP for bulletproof test:
1. run with 2 modules: 'mod-A', 'mod-B'
2. Agents:
   - mod-A: agt1 completed (T1)
   - mod-B: agt2 failed (T1) 
   - mod-B: agt3 completed (T2) -- retry succeeded
3. Expected: completedCount = 2 (COUNT DISTINCT module_id where completed)
4. Bug behavior: completedCount = 2 (happens to be correct with COUNT(*) too since only agt1 and agt3 are completed)

BETTER REVISED - force the inflation:
1. run with 2 modules: 'mod-A', 'mod-B'
2. Agents:
   - mod-A: agt1 completed (T1)
   - mod-A: agt2 completed (T2) -- somehow got rebuilt (e.g. engine glitch or manual rerun)
   - mod-B: agt3 completed (T1)
3. Bug: COUNT(*) status=completed = 3 (wrong, only 2 unique modules)
4. Fix: COUNT(DISTINCT module_id) = 2

PASS CRITERIA:
- completedCount must equal 2 (the number of distinct modules with at least one completed agent)
- Not 3 (which would be the raw count of completed builder agents)

IMPLEMENTATION:
The fix is in toRunSummary() in src/dashboard/server.ts. Change:
  SELECT COUNT(*) as cnt FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed'
To:
  SELECT COUNT(DISTINCT module_id) as cnt FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND module_id IS NOT NULL