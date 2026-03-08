---
name: spec-case-duplicate-in-server-switch
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NRZ2KMXYSHE6YA1PV0PC9
---

CHANGE SCENARIO: server.ts has duplicate case 'spec' at lines 1012 and 1018 in the switch statement. The second case is unreachable dead code. PASS CRITERIA: Each case value appears exactly once in the switch. FAIL CRITERIA: Duplicate case value exists, second case is unreachable.