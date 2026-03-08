---
name: evaluator-screenshots-captured
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A visual spec (title contains 'login page component') has been built and evaluation phase is complete. Playwright is available in the project.

Steps:
1. Check .df/runs/<run-id>/screenshots/ directory exists
2. Verify at least one file matching pattern eval-*.png exists
3. Read .df/runs/<run-id>/screenshots/manifest.json
4. Verify manifest contains entries where phase equals 'eval'
5. Verify eval entries have filename starting with 'eval-', a scenario name, and timestamp
6. Verify screenshot files referenced in manifest actually exist on disk
7. GET /api/runs/<run-id>/screenshots/<eval-filename> — expect 200 with image/png content-type

Pass criteria:
- eval-*.png files exist in screenshots directory
- manifest.json contains eval-phase entries
- Each eval manifest entry has valid filename, phase='eval', scenario name, timestamp
- Screenshot files are readable via API endpoint
- Image files are valid PNG format

Fail criteria:
- No eval screenshots captured after evaluation completes
- Manifest missing eval entries
- Files referenced in manifest don't exist on disk
- API returns 404 for existing screenshot files