---
name: timeline-shows-completed-specs
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Create 3 specs and complete them via runs on different days within the current week. Spec A completed Monday with cost $5.00 and 4/4 scenarios passing. Spec B completed Wednesday with cost $8.50 and 7/8 scenarios passing. Spec C completed today with cost $12.00 and 6/6 scenarios passing.

Steps:
1. Start the dashboard server (dark dash)
2. Navigate to the Timeline tab (or /timeline route)
3. Inspect the 'This Week' section

Expected:
- All 3 specs appear in 'This Week' section
- Spec C appears first (most recent), then Spec B, then Spec A
- Each entry shows: spec title, relative completion date, cost, and scenario pass rate
- Spec A shows '4/4', Spec B shows '7/8', Spec C shows '6/6'
- Costs shown as $5.00, $8.50, $12.00 respectively

Pass criteria: All 3 specs render in correct time group, correct order, with accurate cost and pass rate data.