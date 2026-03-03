---
name: build-button-disabled-during-active-build
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Build button is disabled while a build is actively running.

PRECONDITIONS:
- Dark Factory project initialized
- Dashboard running
- A draft spec exists

STEPS:
1. Open dashboard, click on the draft spec
2. Verify 'Build' button is enabled (clickable)
3. Click the 'Build' button to start a build
4. While the build is running (run status = 'running' or 'pending'), verify the 'Build' button state

EXPECTED RESULTS:
- After starting a build, the 'Build' button becomes disabled (greyed out, not clickable)
- Clicking the disabled button does not trigger another POST /api/builds
- The button should remain disabled for the duration of the active build
- Once the build completes (success or failure), the button should re-enable (for failed runs) or the spec becomes locked (for successful runs)

EDGE CASES:
- If user opens another browser tab with the same spec, the build button should reflect the active run status
- POST /api/builds should reject requests for specs that already have an active run (return 409 Conflict or similar)
- The API response should include an error message like 'Build already in progress for this spec'

VERIFICATION:
- Check the button DOM element for disabled attribute or pointer-events: none
- Attempt to call POST /api/builds directly for a spec with active run — should fail
- Verify no duplicate runs are created in the runs table

PASS CRITERIA:
- Button visually disabled during active build
- No duplicate builds possible via UI
- API rejects duplicate build requests
- Button re-enables appropriately after build completion