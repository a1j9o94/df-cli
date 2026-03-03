---
name: swarm-budget-cap
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Swarm respects cross-run budget cap
PRECONDITIONS:
- Dark Factory project initialized
- 3 specs exist: spec_A, spec_B, spec_C (all draft, no dependencies between them — all ready)
- Each build is expected to cost approximately equal amounts
STEPS:
1. Run: dark swarm --budget-usd 5 --parallel 1
2. Observe builds starting sequentially
3. After cumulative cost across all runs exceeds $5, verify swarm stops
EXPECTED:
- Swarm starts building spec_A first
- After spec_A completes, checks cumulative cost
- If under budget, starts spec_B
- When cumulative cost exceeds $5, swarm stops even if specs remain unbuilt
- Output message indicates budget exhaustion as the stop reason
VALIDATION:
- SwarmResult.stoppedReason === 'budget-exhausted'
- SwarmResult.totalCostUsd >= 5.0
- SwarmResult.remainingSpecs.length > 0 (some specs left unbuilt)
- Total runs cost in DB sums to >= budget
PASS CRITERIA: Swarm halts when cumulative cost exceeds budget, reports remaining specs.