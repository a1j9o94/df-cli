---
name: tab-defs-array-not-used-to-generate-html
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: TAB_DEFS array exists in dashboard JS (line 890) but the HTML tab buttons are hardcoded (lines 57-59) instead of being generated from TAB_DEFS. Adding a new tab requires updating BOTH the TAB_DEFS array AND the HTML template. VERIFICATION: 1. TAB_DEFS defines overview/modules/validation tabs. 2. HTML template has hardcoded <button> tags for each tab. 3. Tab panels are also hardcoded in HTML. PASS CRITERIA: Tab buttons and panels should be generated from TAB_DEFS, so adding a tab only requires adding to TAB_DEFS + a render function. FAIL: HTML has hardcoded tab buttons separate from TAB_DEFS.