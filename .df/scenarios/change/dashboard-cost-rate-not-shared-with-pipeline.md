---
name: dashboard-cost-rate-not-shared-with-pipeline
type: change
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRKYXN00P1MJH4Q3XXHP69B
---

CHANGE SCENARIO: Dashboard cost estimation in agent-enrichment.ts uses DEFAULT_COST_RATE_PER_MIN=0.05, but pipeline files (build-phase.ts line 96, agent-lifecycle.ts line 149) have their own inline 0.05 magic number. STEPS: 1. Verify agent-enrichment.ts has named constant. 2. Verify build-phase.ts and agent-lifecycle.ts use inline 0.05. 3. Changing the rate requires modifying 3 files instead of 1. PASS: All consumers import a single exported constant from one location. FAIL: Cost rate duplicated across dashboard (agent-enrichment.ts) and pipeline (build-phase.ts, agent-lifecycle.ts) with no shared constant.