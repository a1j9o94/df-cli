---
name: dashboard-server-exists
type: functional
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNBP8YDWBE5G0KK4H7V01R0
---

SCENARIO: A 'dark dash' command exists and starts a web dashboard server.

PRECONDITIONS:
- Dark Factory project initialized

STEPS:
1. Run: dark dash --help (or dark --help and look for 'dash' command)
2. Verify the command exists in the CLI
3. If it exists, verify src/dashboard/server.ts (or equivalent) exists
4. Verify the server module exports route handlers for /api/runs, /api/runs/:id, etc.

EXPECTED OUTPUTS:
- 'dark dash' command is registered in the CLI
- A dashboard server module exists in src/dashboard/
- Server module sets up HTTP server on port 3141
- At minimum, routes exist for: /api/runs, /api/runs/:id, /api/runs/:id/agents, /api/runs/:id/events

PASS CRITERIA:
- 'dark dash' appears in CLI help output
- src/dashboard/ directory exists with server.ts and ui.ts (or equivalent)
- FAIL if no dashboard command exists or no server module is present
- This is a prerequisite for all dashboard-related scenarios