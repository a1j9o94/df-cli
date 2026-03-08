---
name: summary-stats-accurate
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Complete 3 specs this month:
- Spec A: cost $5.00, 4/4 scenarios pass (100%)
- Spec B: cost $8.00, 7/8 scenarios pass (87.5%)
- Spec C: cost $12.00, 6/6 scenarios pass (100%)
Have 2 specs currently building.

Steps:
1. Open the Timeline tab
2. Inspect the Summary Stats Bar at the top

Expected:
- 'Specs completed this month' shows: 3
- 'Total cost this month' shows: $25.00
- 'Average scenario pass rate' shows: 95.8% (calculated as (4+7+6)/(4+8+6) = 17/18 = 94.4%) — OR weighted average: (100+87.5+100)/3 = 95.8%
- 'Specs in progress' shows: 2

Note: The spec says 'average scenario pass rate' — verify whether it's per-scenario weighted (17/18=94.4%) or per-spec average ((100+87.5+100)/3=95.8%). The spec example says 95.8% for these numbers, implying per-spec average.

Pass criteria: All 4 summary stats are numerically accurate and visually displayed in a stats bar.