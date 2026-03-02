---
name: server-and-listEvents-both-use-desc-order
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPD42HJG0YB8BSQEHB09TFK
---

SCENARIO: Both listEvents() in events.ts AND handleGetEvents() in server.ts use DESC ordering. This means changing one does NOT fix the other (DRY violation). Additionally, the getResumePoint function calls listEvents with type filter, but since results are DESC, it still works because it just checks Set membership. However, any timeline display is backwards. STEPS: 1. events.ts line 48: ORDER BY created_at DESC, rowid DESC. 2. server.ts line 299: ORDER BY created_at DESC, rowid DESC (duplicated SQL). 3. Both must be changed to ASC for chronological display. PASS CRITERIA: Both locations use ASC order AND server.ts reuses listEvents() instead of duplicating SQL. FAIL if either uses DESC or SQL is duplicated.