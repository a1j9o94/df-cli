---
name: spec-title-visible
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: Spec title visible in dashboard run cards.

PRECONDITIONS:
- Database has a spec with id='spec_test1' and title='Require holdout scenarios before build'
- Database has a run with spec_id='spec_test1'
- Dashboard server is running

TEST STEPS:
1. Fetch GET / (HTML dashboard)
2. Inspect the JavaScript that renders run cards (renderRunsList function)
3. Verify that the run card rendering uses specTitle (from enriched RunSummary) as primary text, NOT specId
4. Fetch GET /api/runs and verify each RunSummary object contains a 'specTitle' field with the actual spec title string
5. Verify the specId is NOT shown as the primary headline text in run cards - it should be secondary (tooltip, small monospace, or hidden)

EXPECTED RESULTS:
- GET /api/runs returns objects with specTitle field (e.g. 'Require holdout scenarios before build')
- The HTML run card shows the specTitle as the primary .run-card-spec text
- The raw spec ID (e.g. 'spec_01KJNEMDNEKG3...') is NOT the main visible text in run cards

PASS CRITERIA: 
- /api/runs response includes specTitle as a non-empty string for runs with valid spec_id
- The rendered run card HTML uses specTitle for primary display