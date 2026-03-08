---
name: change-warning-threshold
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

MODIFICATION: Change the budget warning threshold from 80% to 90%. EXPECTED EFFORT: Update a single constant (e.g., BUDGET_WARNING_THRESHOLD = 0.8 -> 0.9) in one file (budget.ts or a config file). No logic changes required. AFFECTED AREAS: Only the threshold check in budget monitoring code. VERIFICATION: After change, warning should fire at 90% instead of 80%. The rest of the system (pause at 100%, resume, dashboard) should be unaffected. PASS CRITERIA: Single constant change, no logic modifications needed.