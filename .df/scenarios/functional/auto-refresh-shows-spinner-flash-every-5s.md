---
name: auto-refresh-shows-spinner-flash-every-5s
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRVEYFDXJNJKNTH0MA6VNV3
---

SCENARIO: Auto-refresh calls loadAgents() and loadModules() which unconditionally set innerHTML to a loading spinner before every fetch. This causes a visible 'flash' of the loading spinner every 5 seconds during auto-refresh. STEPS: 1. Open dashboard with a selected run. 2. Wait for auto-refresh (5s interval). 3. Observe agents and modules panels during refresh. EXPECTED: Panels should NOT flash loading spinners during auto-refresh. Data should update in-place. ACTUAL: Both panels briefly show 'Loading agents...' and 'Loading modules...' spinners before data replaces them. FIX: Add a parameter to loadAgents/loadModules to skip spinner on auto-refresh, or only show spinner when container is empty.