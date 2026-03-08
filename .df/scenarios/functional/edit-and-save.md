---
name: edit-and-save
type: functional
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

PRECONDITION: Dashboard running, .df/config.yaml has max_parallel=4. STEPS: 1. Open Settings tab. 2. Change Max parallel builders field from 4 to 2. 3. Click Save button. 4. Verify a 'Config saved' toast notification appears. 5. Read .df/config.yaml directly and verify build.max_parallel is now 2. 6. Verify all other config values remain unchanged (deep merge, not overwrite). 7. Refresh the Settings tab. Verify Max parallel builders still shows 2. 8. Start a new build via API (POST /api/builds). 9. Verify the new build uses max_parallel=2 (check build config). PASS CRITERIA: Config file updated correctly, other fields preserved, new builds use updated value, toast shown on save.