---
name: no-runs-empty-state
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: Dashboard shows helpful empty state when no runs exist.

Preconditions:
- Dark Factory project initialized (.df/ directory exists with state.db)
- No runs in the database (runs table is empty)

Steps:
1. Start dashboard server
2. GET /api/runs — verify returns empty array []
3. GET / (HTML page) — verify it renders an empty state message
4. The empty state message should include guidance text like 'No pipeline runs yet. Run: dark build <spec-id>' or similar
5. The page should still render with the dark theme and basic structure (header, etc.)
6. No JavaScript errors in the page (the polling should handle empty state gracefully)

Expected Outputs:
- /api/runs returns [] (empty JSON array) with status 200
- HTML page returns 200 with valid HTML
- HTML body contains text indicating no runs exist (e.g., 'No pipeline runs', 'no runs', 'empty')
- HTML body contains guidance on how to start a run (mentions 'dark build' or similar command)
- Page structure is intact (header with project name, dark theme CSS still applied)

Pass/Fail Criteria:
- PASS if empty array returned from API and HTML shows helpful empty state message with guidance
- FAIL if API returns error instead of empty array, or HTML shows broken/blank page, or no guidance text