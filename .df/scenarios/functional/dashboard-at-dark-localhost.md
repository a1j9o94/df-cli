---
name: dashboard-at-dark-localhost
type: functional
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Test: Dashboard serves at dark.localhost when portless is available.

Setup:
1. Ensure portless package is installed (in node_modules or globally)
2. No --no-portless flag passed

Steps:
1. Run dark dash (or invoke createDashAction programmatically with returnHandle=true)
2. Observe the returned ServerHandle

Expected:
- ServerHandle.url should be 'http://dark.localhost' (not 'http://localhost:3141')
- The server should still be listening on port 3141
- The browser open command should be called with 'http://dark.localhost'
- Log output should show 'Dashboard running at http://dark.localhost'

Verification:
- HTTP GET to http://localhost:3141 should return 200 with dashboard HTML
- The portless mapping from dark.localhost to localhost:3141 should be registered

Pass criteria: ServerHandle.url contains 'dark.localhost' and server responds on port 3141