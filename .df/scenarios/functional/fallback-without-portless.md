---
name: fallback-without-portless
type: functional
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Test: Dashboard falls back to localhost:PORT when portless is not available.

Setup:
1. Ensure portless is NOT installed (mock import failure or uninstall)
2. No --no-portless flag passed

Steps:
1. Run dark dash (or invoke createDashAction programmatically with returnHandle=true)
2. Observe the returned ServerHandle
3. Check log output

Expected:
- ServerHandle.url should be 'http://localhost:3141'
- A warning/note should be logged indicating portless is not installed
- The browser should open http://localhost:3141
- The dashboard should function normally despite portless absence

Pass criteria: 
- URL is http://localhost:3141 (fallback)
- Log contains message about portless not being available
- Dashboard HTML is served correctly at localhost:3141