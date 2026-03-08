---
name: server-has-19-inline-prepare-calls
type: change
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5QSCQ40PCWYRANGB212A2V
---

CHANGE SCENARIO: server.ts contains 19 db.prepare() calls with inline SQL, all bypassing db/queries/ modules. Previous scenarios estimated 7 or 16, but actual count is 19. VERIFICATION: Count all .prepare() calls in src/dashboard/server.ts. PASS: 0 inline prepare calls, all delegated to db/queries/. FAIL: Any inline prepare calls exist in server.ts.