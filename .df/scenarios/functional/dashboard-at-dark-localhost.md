---
name: dashboard-at-dark-localhost
type: functional
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Preconditions: portless package is installed as a dependency. Steps: 1. Run 'dark dash' command. 2. Verify server starts on port 3141. 3. Verify portless registers dark.localhost mapping to localhost:3141. 4. Verify browser opens http://dark.localhost (not http://localhost:3141). 5. Verify the dashboard HTML page loads correctly at http://dark.localhost. 6. Verify the ServerHandle.url returns 'http://dark.localhost'. Pass criteria: Browser opens dark.localhost, page loads with dashboard content, no errors in console.