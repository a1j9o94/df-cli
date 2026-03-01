---
name: ui-module-import-path
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Dashboard server correctly imports the UI module

PRECONDITIONS:
- Both src/dashboard/server.ts and the UI module exist
- The UI module exports generateDashboardHtml function

STEPS:
1. Start the dashboard server (dark dash)
2. GET / — request the HTML page
3. Verify the response contains the full dashboard UI (not just the placeholder)
4. Check for: sidebar with runs list, detail panels, tab bar with Agents/Modules tabs
5. Check for: inline CSS with CSS custom properties (--bg-primary, --accent-blue, etc.)
6. Verify the UI module's generateDashboardHtml was called (not the fallback placeholder)

EXPECTED OUTPUTS:
- HTML contains the full sidebar layout with runs-container
- HTML contains tab-bar with Agents and Modules buttons
- HTML does NOT show 'Dashboard UI module loading...' (that's the placeholder)
- The server's dynamic import resolves the UI module successfully

PASS CRITERIA:
- Full UI renders (not placeholder)
- UI module path in server.ts matches the actual UI module filename
- If server imports './ui.js' the UI module must be at src/dashboard/ui.ts (not index.ts)
- If UI module is at src/dashboard/index.ts, server must import './index.js'
