---
name: timeline-shows-completed-specs
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Timeline shows completed specs

### Preconditions
- Project initialized with dark init
- 3 specs created and built to completion across different days within the current and previous week

### Setup Steps
1. Create spec A, build to completion (simulate completed 2 days ago)
2. Create spec B, build to completion (simulate completed 5 days ago, same week)
3. Create spec C, build to completion (simulate completed 10 days ago, previous week)
4. Each run should have evaluation events with pass/fail data

### Test Steps
1. Start the dashboard server: dark dash --no-open
2. Make GET request to /api/timeline
3. Inspect the 'thisWeek', 'lastWeek', and 'earlier' sections in the response
4. Also load the dashboard HTML and verify the Timeline tab exists and is clickable

### Expected Results
- GET /api/timeline returns 200 with valid JSON
- Response has 'thisWeek' array containing specs A and B (completed within current calendar week Mon-Sun)
- Response has 'lastWeek' array containing spec C (completed in previous calendar week)
- Each entry contains: specTitle (string, not a spec ID), completedAt (ISO string), cost (number >= 0), passRate (string like '8/8')
- Entries within each section sorted by completion date, most recent first
- The Timeline tab is present in the dashboard HTML alongside Overview, Modules, and Validation tabs

### Pass/Fail Criteria
- PASS: All entries appear in correct time buckets with required fields populated
- FAIL: Missing entries, wrong time bucket, missing fields, or spec IDs shown instead of titles