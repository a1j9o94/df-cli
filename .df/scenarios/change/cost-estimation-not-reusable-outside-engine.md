---
name: cost-estimation-not-reusable-outside-engine
type: change
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP56F9VX5MEQVEJE8BANG6Q
---

CHANGEABILITY SCENARIO: Cost estimation logic (estimateCostIfMissing) is a private method on PipelineEngine class, not a standalone reusable function. Adding cost tracking to any new CLI command (e.g., dark agent pause) requires either: (1) duplicating the ~10-line heuristic, or (2) refactoring it out of the engine first. VERIFICATION: Check that estimateCostIfMissing is private on PipelineEngine (engine.ts ~line 751). Check that budget.ts exports recordCost but it requires 5 params (db, runId, agentId, costUsd, tokensUsed) — not self-contained. No standalone function exists that takes just (db, agentId) and handles estimation + recording. PASS CRITERIA: PASS if a standalone estimateAndRecordCost(db, agentId) function exists in budget.ts. FAIL (expected) if cost estimation remains a private engine method requiring 5+ params to invoke.