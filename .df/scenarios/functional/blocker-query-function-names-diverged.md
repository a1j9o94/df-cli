---
name: blocker-query-function-names-diverged
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK774KFJPP60P9ZQQ054NTRT
---

SETUP: Three builder branches exist (schema-types, cli-commands, dashboard-ui) each implementing src/db/queries/blockers.ts. STEPS: 1. CLI branch exports: listBlockers(db, runId, opts), getBlockersForAgent(db, agentId). 2. Schema/Dashboard branches export: listBlockersByRun(db, runId, status?), listBlockersByAgent(db, agentId). 3. CLI branch's blockers.ts command imports listBlockers, but Schema/Dashboard branches don't export that name. 4. Dashboard server.ts imports listBlockersByRun, which CLI branch doesn't export. PASS CRITERIA: All blocker query function names are consistent across modules. Currently FAILS — names diverged between builders.