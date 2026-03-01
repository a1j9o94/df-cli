---
name: ui-module-import-path-consistency
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNCFDB4XCTNP384RQ41KS8V
---

FUNCTIONAL SCENARIO: Dashboard UI module import path matches actual file location

DESCRIPTION:
server.ts line 530 imports the UI module as './ui.js' but the actual file is src/dashboard/index.ts (which would compile to index.js). This means the dynamic import in startServer() would fail to find the UI module, falling back to the placeholder HTML.

STEPS:
1. Check src/dashboard/ for files: should contain index.ts (UI) and server.ts
2. In server.ts startServer(), find the dynamic import line for the UI module
3. Verify the import path resolves to the actual UI file

EXPECTED:
- The import path in server.ts should match the actual filename of the UI module
- If UI module is index.ts, import should reference './index.js' not './ui.js'
- generateDashboardHtml should be loadable at runtime

PASS CRITERIA:
- The dynamic import path resolves to the actual UI module file
- FAIL if import path references 'ui.js' but file is 'index.ts' (would compile to 'index.js')
- The dashboard should display the full UI, not the placeholder 'Dashboard UI module loading...' text