---
name: empty-timeline
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Empty timeline - clean empty state

### Preconditions
- Fresh project with no completed runs

### Setup Steps
1. Initialize a fresh dark project
2. No specs built or in progress

### Test Steps
1. GET /api/timeline
2. Load dashboard Timeline tab

### Expected Results
- API returns 200 with valid JSON
- summary.completedThisMonth === 0
- summary.totalCostThisMonth === 0
- summary.avgPassRate === 0 or null
- summary.inProgressCount === 0
- thisWeek, lastWeek, earlier, inProgress are empty arrays
- Dashboard Timeline tab shows friendly empty state message
- No JS errors, no undefined or NaN in UI

### Pass/Fail Criteria
- PASS: Clean empty state with zero counts and empty arrays
- FAIL: 500 error, NaN/undefined, blank UI, or JS errors