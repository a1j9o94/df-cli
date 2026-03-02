---
name: no-agent-model-column-in-schema
type: change
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP56F9VX5MEQVEJE8BANG6Q
---

CHANGEABILITY SCENARIO: Making cost rate per-model configurable requires a schema change because the agents table has no 'model' column. VERIFICATION: 1. Read src/db/schema.ts — agents table columns do NOT include model. 2. The cost heuristic in engine.ts line 756 uses 0.05 for all agents regardless of model. 3. To implement per-model cost rates (e.g., Sonnet=0.05, Opus=0.15, Haiku=0.01), you need: (a) add 'model' column to agents table, (b) populate it at agent creation, (c) look up rate per model in cost estimation. PASS CRITERIA: PASS if agents table has a 'model' column. FAIL (expected) if no model tracking exists.