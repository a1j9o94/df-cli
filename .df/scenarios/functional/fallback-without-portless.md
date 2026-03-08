---
name: fallback-without-portless
type: functional
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Preconditions: portless package is NOT installed or not available. Steps: 1. Ensure portless is not available (mock import failure or uninstall). 2. Run 'dark dash' command. 3. Verify server starts on port 3141 as normal. 4. Verify browser opens http://localhost:3141 (fallback URL). 5. Verify a note/warning is logged indicating portless is not installed and falling back to localhost:port. 6. Verify dashboard still functions normally at localhost:3141. Pass criteria: No crash, graceful fallback to localhost:3141, informational message about portless not being available.