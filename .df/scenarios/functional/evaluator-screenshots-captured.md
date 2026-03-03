---
name: evaluator-screenshots-captured
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Evaluator Screenshots Captured

### Preconditions
- A spec exists with goal mentioning 'frontend component' (visual keyword detected)
- Playwright is available in the project
- The pipeline has completed through the evaluate-functional phase

### Test Steps
1. After evaluation completes, check the directory .df/runs/<run-id>/screenshots/
2. List all files matching pattern eval-*.png
3. Verify at least one screenshot exists with filename starting with 'eval-'
4. Read .df/runs/<run-id>/screenshots/manifest.json
5. Verify manifest contains entries with phase='eval'
6. Verify each eval entry has: filename matching /^eval-/, phase='eval', scenario field set, caption, timestamp

### Expected Output
- At least one eval-*.png file exists in screenshots directory
- manifest.json includes eval-phase entries with scenario names
- Eval screenshots have ISO 8601 timestamps

### Pass Criteria
- Files named eval-<scenario>.png exist on disk
- manifest.json is valid JSON array
- All eval entries have phase='eval' and non-empty scenario field
- Timestamps are valid ISO 8601 strings