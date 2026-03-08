---
name: server-prepare-count-is-30-not-less
type: change
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7NM79WZPQ5S2BK6HWS8SYQ
---

Verify server.ts has exactly 30 db.prepare() calls (not 7, 16, or 19 as some stale scenarios claim). Run: grep -c 'db.prepare\|\.prepare(' src/dashboard/server.ts. PASS: count equals 30. FAIL: any other count. Also verify server.ts imports from db/queries/blockers.js (not zero query imports as some scenarios claim).