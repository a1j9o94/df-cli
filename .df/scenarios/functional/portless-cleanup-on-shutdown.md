---
name: portless-cleanup-on-shutdown
type: functional
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Test: Portless domain mapping is cleaned up when dashboard shuts down.

Setup:
1. Portless is installed and active
2. Dashboard is running with dark.localhost mapping

Steps:
1. Start dark dash with portless active
2. Verify dark.localhost is mapped
3. Send SIGINT (Ctrl+C) or call handle.stop()
4. Check that portless mapping is removed

Expected:
- After shutdown, the portless mapping for dark.localhost should be deregistered/cleaned up
- No orphaned mappings left behind
- Graceful shutdown message appears in logs

Pass criteria:
- Portless cleanup function called during shutdown
- No stale domain mappings persist after server stops