---
name: change-time-grouping
type: change
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Change time grouping from calendar weeks to rolling 7-day windows

### Modification
Switch from calendar-week grouping (Mon-Sun) to rolling 7-day windows.

### Affected Areas
1. src/db/queries/timeline.ts - date bucketing logic only
2. No UI changes needed
3. No CLI changes needed

### Expected Effort
- 1 file, 5-10 lines changed
- Less than 30 minutes

### Pass/Fail Criteria
- PASS: Only date bucketing logic in timeline queries needs changing
- FAIL: Requires touching UI, CLI, or API response schema