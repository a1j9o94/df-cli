---
name: overview-shows-spec-title-not-first-paragraph
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT5YPN16MQWVJHDC1V5NBYW
---

CHANGE SCENARIO: The spec says the overview should show the spec GOAL (first paragraph from spec file). But loadOverview() in index.ts only shows specData.title, not the first paragraph of the spec content. The spec endpoint returns both title and content fields, but the UI only renders the title. VERIFICATION: 1. loadOverview() at index.ts line 1244 renders specData.title only. 2. The /api/runs/:id/spec endpoint returns { title, content } where content has the full markdown body. 3. The first paragraph of content is NOT extracted or displayed. PASS CRITERIA: Overview should show spec goal (first paragraph of spec content), not just the title. FAIL: Only title is shown.