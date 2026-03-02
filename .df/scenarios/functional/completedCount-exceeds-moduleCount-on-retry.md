---
name: completedCount-exceeds-moduleCount-on-retry
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ61PK9FQEVPTC780QYZBRS
---

SCENARIO: In toRunSummary (src/dashboard/server.ts line 175-181), completedCount uses COUNT(*) of completed builders: 'SELECT COUNT(*) as cnt FROM agents WHERE run_id = ? AND role = builder AND status = completed'. When a module is retried and both the original AND retry complete, this counts both agents. With 3 modules and 1 retry, completedCount=4 but moduleCount=3. STEPS: 1. Create run with 3-module buildplan. 2. Insert agents: mod-a completed, mod-b completed, mod-c failed then completed (2 agents). 3. GET /api/runs/:id. EXPECTED: completedCount=3 (distinct modules). ACTUAL: completedCount=4. FIX: Use COUNT(DISTINCT module_id) or subquery for distinct completed modules.