---
name: dashboard-module-exists
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNC56310SNWYZW3XKQ6DJX9
---

SCENARIO: A src/dashboard/ directory must exist with server.ts and ui.ts files

PRECONDITIONS:
- Project has been built

STEPS:
1. Check for existence of src/dashboard/ directory
2. Check for src/dashboard/server.ts
3. Check for src/dashboard/ui.ts (or equivalent UI module)
4. Check that dark dash command is registered in src/index.ts

EXPECTED:
- src/dashboard/ directory exists
- src/dashboard/server.ts exports HTTP route handlers
- src/dashboard/ui.ts (or index.ts) exports generateDashboardHtml function
- dark dash command appears in src/index.ts imports and program.addCommand()

PASS CRITERIA:
- All four files/registrations exist
- FAIL if src/dashboard/ does not exist — this blocks ALL dashboard scenarios
- FAIL if dark dash is not registered as a CLI command
- Current codebase is MISSING the entire dashboard directory — this is the single biggest gap
- 13+ scenarios depend on the dashboard existing