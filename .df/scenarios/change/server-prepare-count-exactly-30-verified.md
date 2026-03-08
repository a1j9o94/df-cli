---
name: server-prepare-count-exactly-30-verified
type: change
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7M1CWFVCEJ0GX143ASJYM3
---

Verification: src/dashboard/server.ts has exactly 30 db.prepare() calls. It imports only from db/queries/blockers.js (1 query module import). Buildplan query is duplicated 5 times at lines 207, 299, 371, 490, 611. Duplicate case 'spec' at lines 1081 and 1087 (second is unreachable dead code). PASS if prepare count is exactly 30 and buildplan duplication is 5. FAIL otherwise.