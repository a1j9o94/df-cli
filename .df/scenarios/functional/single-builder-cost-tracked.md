---
name: single-builder-cost-tracked
type: functional
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

SCENARIO: Single builder (no buildplan) completes with cost >0.

PRECONDITIONS:
- A Dark Factory project is initialized
- A run exists with a spec but no buildplan (triggers single-builder fallback path)

STEPS:
1. Run `dark build --skip-architect` to trigger single-builder fallback (no buildplan)
2. The builder agent spawns, does work, calls `dark agent complete <id>`
3. Query the agent record: SELECT cost_usd FROM agents WHERE id = <builder-id>

EXPECTED:
- agent.cost_usd > 0 after builder completes
- The cost should be proportional to elapsed time (e.g., if builder ran for 2 minutes at $0.05/min, cost ~ $0.10)

PASS CRITERIA:
- agent.cost_usd > 0
- The cost was recorded WITHOUT the engine calling estimateCostIfMissing — it was recorded by the agent command layer (dark agent complete)

FAIL CRITERIA:
- agent.cost_usd == 0 after single builder completes
- estimateCostIfMissing still exists in build-phase.ts or agent-lifecycle.ts