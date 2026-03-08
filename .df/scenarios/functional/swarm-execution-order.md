---
name: swarm-execution-order
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Four specs exist:
- A: no dependencies (draft)
- B: depends_on [A] (draft)
- C: depends_on [A] (draft)
- D: depends_on [B, C] (draft)

STEPS:
1. Run: dark swarm --dry-run
2. Verify the execution plan shows:
   - Layer 0: A (builds first)
   - Layer 1: B, C (can build in parallel after A)
   - Layer 2: D (builds after both B and C)
3. Run: dark swarm (actual execution, may need --budget-usd to limit)
4. Monitor build order via events table or run logs

EXPECTED:
- A starts building first
- B and C do NOT start until A reaches completed status
- D does NOT start until both B and C reach completed status
- If --parallel 2, B and C may run simultaneously
- Final state: all four specs have status=completed (or building if budget runs out)

PASS/FAIL:
- PASS if dependency order is respected: A before {B,C}, {B,C} before D
- FAIL if any spec starts before its dependencies are completed