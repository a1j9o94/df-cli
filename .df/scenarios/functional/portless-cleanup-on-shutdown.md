---
name: portless-cleanup-on-shutdown
type: functional
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Preconditions: portless is installed, dark dash is running with dark.localhost mapped. Steps: 1. Run 'dark dash' and verify dark.localhost is mapped. 2. Send SIGINT (Ctrl+C) to the process. 3. Verify portless mapping is cleaned up / deregistered on shutdown. 4. Verify dark.localhost no longer resolves after shutdown. 5. Verify server stop is called cleanly. Pass criteria: Graceful shutdown includes portless cleanup, no orphaned domain mappings remain.