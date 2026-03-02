---
name: phase-names-tightly-coupled-to-scenario-types
type: change
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJPAH46Y8AXDSK1QTJXMT0CF
---

CHANGEABILITY SCENARIO: PhaseName type in phases.ts includes evaluate-functional and evaluate-change as separate phase names, tightly coupling scenario types to the phase loop. Adding a new scenario type (e.g., performance) requires adding a new phase name, updating PHASE_ORDER, and updating shouldSkipPhase. VERIFICATION: 1. Read phases.ts: PhaseName includes evaluate-functional and evaluate-change. 2. PHASE_ORDER has 8 entries including both evaluate phases. 3. shouldSkipPhase has case for evaluate-change (skip in quick mode). 4. Adding evaluate-performance requires: new PhaseName, new PHASE_ORDER entry, new shouldSkipPhase case, new engine.ts case for spawning evaluator. PASS CRITERIA: PASS if evaluation is a single phase that runs both functional and change evaluators (parameterized by mode), making new scenario types additive without phase changes. FAIL (expected) if each scenario type requires its own phase definition.