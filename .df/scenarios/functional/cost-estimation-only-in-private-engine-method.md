---
name: cost-estimation-only-in-private-engine-method
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPKN1YNAXDMSCVEDTPT9V4P
---

SETUP: Examine cost estimation code across the codebase. STEPS: 1. Check if estimateCostIfMissing is a private method on PipelineEngine in engine.ts. 2. Search for any standalone exported cost estimation function in budget.ts or any other file. 3. Verify that commands like agent/heartbeat.ts, agent/complete.ts, mail/check.ts do NOT have access to cost estimation logic. PASS CRITERIA: - A standalone exported function (e.g., estimateAgentCost(db, agentId)) exists in budget.ts or a separate cost module - The function is importable and usable by CLI commands and the dashboard server, not just the engine FAIL CRITERIA: - estimateCostIfMissing is private on PipelineEngine - No standalone cost estimation function is available outside the engine class - CLI commands cannot estimate costs without duplicating logic