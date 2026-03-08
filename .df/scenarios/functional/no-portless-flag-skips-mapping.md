---
name: no-portless-flag-skips-mapping
type: functional
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Preconditions: portless is installed and available. Steps: 1. Run 'dark dash --no-portless'. 2. Verify server starts on port 3141. 3. Verify portless registration is NOT called (domain mapping skipped). 4. Verify browser opens http://localhost:3141 (not dark.localhost). 5. Verify dashboard loads normally. Pass criteria: --no-portless flag prevents domain mapping, falls back to localhost:port behavior, no portless-related code executes.