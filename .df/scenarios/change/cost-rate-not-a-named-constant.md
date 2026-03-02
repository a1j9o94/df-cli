---
name: cost-rate-not-a-named-constant
type: change
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJPAH46Y8AXDSK1QTJXMT0CF
---

CHANGEABILITY SCENARIO: The cost estimation rate (0.05 dollars per minute) is not a named constant — it appears inline in the computation at engine.ts line 831. VERIFICATION: 1. Read engine.ts line 831: const estimatedCost = Math.max(0.01, elapsedMin * 0.05). 2. Grep for COST_RATE or costRate — not found. 3. The rate 0.05 is embedded in the arithmetic expression, not extracted as a configurable constant. PASS CRITERIA: PASS if the cost rate is defined as a named constant (e.g., COST_PER_MINUTE = 0.05) that can be changed without touching the computation formula. FAIL (expected) if the rate is a magic number inline in the formula.