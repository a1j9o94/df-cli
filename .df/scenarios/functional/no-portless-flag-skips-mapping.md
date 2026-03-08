---
name: no-portless-flag-skips-mapping
type: functional
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Test: --no-portless flag skips domain mapping entirely.

Setup:
1. Portless IS installed and available
2. Pass --no-portless flag

Steps:
1. Run dark dash --no-portless (or invoke with portless:false option)
2. Observe the returned ServerHandle

Expected:
- ServerHandle.url should be 'http://localhost:3141' (NOT dark.localhost)
- No portless registration should be attempted
- Browser opens http://localhost:3141
- No portless-related log messages

Pass criteria:
- URL is http://localhost:3141 despite portless being available
- Portless setup function is never called when flag is set