---
name: phase-label-map-duplicated-server-and-client
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: Phase label mapping is duplicated in TWO locations: PHASE_LABELS in server.ts (lines 578-587) and PHASE_LABEL_MAP in index.ts JS (lines 953-962). Adding a new phase label requires updating both. VERIFICATION: 1. server.ts PHASE_LABELS maps phase IDs to display names. 2. index.ts PHASE_LABEL_MAP has identical mapping in client-side JS. 3. The phases API endpoint includes labels from server-side, but sidebar friendlyPhase() uses client-side map. PASS CRITERIA: Phase labels should come from a single source - either only server-side (API-driven) or only client-side. FAIL: Labels duplicated in both server and client.