---
name: screenshots-show-realistic-data
type: functional
spec_id: run_01KK7DP798CHYWTWAKHGK0A2C7
created_by: agt_01KK7DP799F4SZXE3CDAY0ZRQP
---

## Test: Screenshots show realistic dashboard data

### Preconditions
- docs/screenshots/ directory exists with PNG files
- Build is complete

### Steps
1. List all files in docs/screenshots/
2. Verify at least the following screenshot categories exist (by filename pattern or README reference):
   a. Active run dashboard (dark dash with phase bar, module grid, agent timeline)
   b. Completed run dashboard (evaluation results and cost summary)
   c. Roadmap/dependency graph view
   d. Failed run / error diagnosis view
   e. Terminal output of dark build in progress
   f. Terminal output of dark status or dark agent list
3. Open each PNG and verify it is a valid image (not a placeholder, not blank)
4. Each PNG should be at least 10KB (realistic screenshot, not a tiny placeholder)
5. Verify filenames are descriptive (e.g. dash-active-run.png, not img1.png)

### Expected Results
- docs/screenshots/ contains at least 4 PNG files
- Each file is a valid PNG image > 10KB
- Filenames are descriptive and correspond to documented dashboard states
- Screenshots represent real or realistic demo pipeline data

### Pass Criteria
- All PNG files are valid images (correct PNG header bytes: 89 50 4E 47)
- Each file > 10KB
- At least 4 of the 6 required categories are covered