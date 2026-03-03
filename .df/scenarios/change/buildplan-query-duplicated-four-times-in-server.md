---
name: buildplan-query-duplicated-four-times-in-server
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: The buildplan query 'SELECT * FROM buildplans WHERE run_id = ? AND status = active ORDER BY version DESC LIMIT 1' is duplicated 4+ times in server.ts (lines 201, 289, 361, 480, 601). Changing the buildplan query logic (e.g., adding a filter or changing sort) requires modifying all 4 locations. VERIFICATION: grep 'buildplans.*active.*ORDER' server.ts returns 4-5 matches. PASS CRITERIA: A single getActiveBuildplan() function should be used everywhere. FAIL: Same query duplicated 4+ times.