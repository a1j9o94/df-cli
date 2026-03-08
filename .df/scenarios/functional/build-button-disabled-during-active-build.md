---
name: build-button-disabled-during-active-build
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Build button is disabled while a run is active
PRECONDITIONS: A spec exists with status 'building' (has an active/running build).
STEPS:
1. Open dashboard
2. Click on the spec that is currently building
3. Observe the Build button state
EXPECTED RESULTS:
- The 'Build' button is visible but disabled (grayed out or with a 'building...' label)
- Clicking the disabled button does nothing (no API call made)
- The button should also be disabled for completed specs
- Once a build finishes (completes or fails), the button should re-enable for failed builds but remain disabled for completed specs
PASS CRITERIA: Button disabled during active build; no API call on click; correct re-enable behavior after build completes/fails