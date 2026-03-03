---
name: add-spec-type-filter
type: change
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Add filtering by spec type (bug/feature)

### Modification
Add ability to filter timeline by spec type.

### Affected Areas
1. GET /api/timeline - add optional type query parameter
2. src/db/queries/timeline.ts - add optional type filter to queries
3. src/dashboard/index.ts - add filter dropdown in Timeline tab header

### Expected Effort
- 3 files modified, ~30-50 lines added total
- No database schema changes needed
- Less than 1 hour

### Pass/Fail Criteria
- PASS: Only needs query param in API, filter param in queries, dropdown in UI
- FAIL: Requires database schema change or restructuring query logic