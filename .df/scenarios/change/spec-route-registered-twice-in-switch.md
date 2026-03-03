---
name: spec-route-registered-twice-in-switch
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: server.ts has duplicate route registration for spec endpoint. The switch statement at lines 690-709 has 'case spec' at BOTH line 699 and line 705. The second case is unreachable dead code. VERIFICATION: Read server.ts switch statement. Two 'case spec' entries exist. PASS CRITERIA: Each API sub-resource should have exactly ONE case in the switch. FAIL: Duplicate case entries exist.