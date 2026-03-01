---
name: dashboard-loads
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJN8ZVVPTNV3AFMP7G0GS969
---

Test: Dashboard loads successfully on dark dash command.

Preconditions:
- Dark Factory project initialized (dark init already run, .df/ exists with state.db)
- At least one run exists in the database (or test both empty and populated states)

Steps:
1. Run 'dark dash' (or start the server programmatically)
2. Verify server starts on default port 3141
3. HTTP GET to http://localhost:3141/ returns 200 with HTML content-type
4. Response body contains the project name text
5. Response body contains a run list or empty state message
6. Response body includes inline CSS (dark theme styles)
7. Response body includes inline JS (polling logic)

Expected Outputs:
- Server binds to port 3141 without error
- GET / returns status 200 with Content-Type text/html
- HTML contains '<html' opening tag and closing '</html>'
- HTML contains inline <style> block with dark theme colors (e.g., background-color with dark value)
- HTML contains inline <script> block with fetch() calls to /api/ endpoints
- If runs exist: page renders a list/selector of runs
- If no runs exist: page shows 'No pipeline runs yet' or similar empty state message

Pass/Fail Criteria:
- PASS if server starts, returns valid HTML with dark theme, and shows run data or empty state
- FAIL if server crashes, returns non-HTML, or missing CSS/JS