---
name: phase-order-hardcoded-in-client-js
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: PHASE_ORDER is hardcoded in client-side JS (index.ts line 897) as var PHASE_ORDER = ['scout', 'architect', ...]. The server has a data-driven phases API endpoint that reads from the authoritative PHASE_ORDER in phases.ts. But the client duplicates this array as a fallback. Adding a phase to phases.ts won't update the client fallback. VERIFICATION: 1. index.ts line 897 hardcodes the 8-phase array. 2. Server phases endpoint derives from imported PHASE_ORDER. 3. Client renderPhaseTimelineFallback() references the local array. PASS CRITERIA: Client should not hardcode PHASE_ORDER; it should only use the phases API endpoint. FAIL: Client has hardcoded phase array.