---
name: summary-stats-accurate
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Summary stats bar accuracy

### Preconditions
- 3 specs completed this month with specific costs and pass rates

### Setup Steps
1. Complete spec A: cost=5.00, all 4 scenarios passed (4/4 = 100%)
2. Complete spec B: cost=8.00, 7 of 8 scenarios passed (7/8 = 87.5%)
3. Complete spec C: cost=12.00, all 6 scenarios passed (6/6 = 100%)
4. All completed within the current calendar month

### Test Steps
1. GET /api/timeline
2. Inspect the 'summary' object

### Expected Results
- summary.completedThisMonth === 3
- summary.totalCostThisMonth === 25.00 (5 + 8 + 12)
- summary.avgPassRate is approximately 0.958 ((4/4 + 7/8 + 6/6) / 3 = (1.0 + 0.875 + 1.0) / 3 ≈ 0.9583)
- summary.inProgressCount equals the number of currently running builds

### Pass/Fail Criteria
- PASS: All 4 summary stats are present and mathematically correct
- FAIL: Missing fields, wrong counts, wrong cost sum, or incorrect average calculation
- NOTE: Average pass rate should be the mean of per-spec pass rates, NOT total-passed / total-scenarios