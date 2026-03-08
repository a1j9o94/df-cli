---
name: buildplan-query-duplicated-five-times-in-server
type: change
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5QSCQ40PCWYRANGB212A2V
---

CHANGE SCENARIO: The buildplan SELECT query appears 5 times in server.ts (lines 201, 289, 361, 480, 601), not 4 as previously estimated. Each is an independent db.prepare() call. VERIFICATION: grep 'buildplans' in server.ts and count SELECT statements. PASS: Buildplan queries delegated to db/queries/buildplans.ts. FAIL: 2+ inline buildplan queries exist.