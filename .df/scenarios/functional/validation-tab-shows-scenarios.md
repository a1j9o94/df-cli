---
name: validation-tab-shows-scenarios
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: Validation tab shows holdout scenarios with pass/fail indicators.

PRECONDITIONS:
- Database has a run that has evaluation events (evaluation-passed or evaluation-failed)
- Scenarios endpoint GET /api/runs/:id/scenarios returns evaluation event data
- Dashboard server is running

TEST STEPS:
1. Fetch GET / (HTML dashboard)
2. Verify the tab bar contains a 'Validation' tab button
3. Verify a validation panel exists (id containing 'validation')
4. Inspect the JavaScript for a validation/scenarios rendering function
5. Verify it fetches GET /api/runs/:id/scenarios
6. Verify the validation panel renders scenario entries with pass/fail indicators
7. If evaluation failed, verify failing scenario details are shown prominently

EXPECTED RESULTS:
- Tab bar has a Validation tab
- Validation panel exists with scenario list rendering
- JavaScript fetches /scenarios endpoint and renders results
- Pass/fail indicators are visually distinct (green checkmark vs red X, or similar)
- Integration test results section exists

PASS CRITERIA:
- HTML contains a Validation tab button
- JavaScript contains fetch logic for /scenarios endpoint
- Rendering function displays scenario results with visual pass/fail indicators