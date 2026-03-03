---
name: in-progress-specs-shown
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## In-progress specs shown in Timeline

### Preconditions
- Project initialized
- At least one spec currently building (run status = 'running')

### Setup Steps
1. Create a spec and start a build (dark build)
2. Let it proceed to the build phase with an active buildplan (e.g., 3 modules, 1 completed)
3. Do NOT wait for completion

### Test Steps
1. GET /api/timeline
2. Inspect the 'inProgress' section

### Expected Results
- The 'inProgress' array contains at least one entry
- Each entry has: specTitle (string, human-readable), phase (string like 'building'), moduleProgress (string like '1/3'), elapsed (string like '5m'), cost (number >= 0)
- If buildplan has estimated_duration_min, the response MAY include estimatedTimeRemaining
- The spec does NOT appear in 'thisWeek', 'lastWeek', or 'earlier' sections

### Pass/Fail Criteria
- PASS: In-progress spec visible with phase, module progress, elapsed time, and cost
- FAIL: Missing from inProgress, appears in completed sections, or missing required fields