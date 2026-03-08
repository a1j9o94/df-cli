---
name: cannot-edit-completed-spec
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Completed specs are read-only in the editor
PRECONDITIONS: A spec exists that has at least one completed run (all scenarios passed). The spec status is 'completed' in the database.
STEPS:
1. Open dashboard
2. Locate the completed spec in the sidebar (should be in 'completed' group)
3. Click on the completed spec to open it in the main panel
4. Verify a 'Locked' badge is visible on the spec
5. Attempt to edit the markdown content in the editor
6. Look for explanation text: 'This spec has a completed build. Create a new spec to make changes.'
EXPECTED RESULTS:
- The editor fields are non-editable (textarea disabled or contenteditable=false)
- A 'Locked' badge is displayed prominently
- Explanation text is visible explaining why the spec is locked
- No Save button is active/visible for locked specs
- The Build button is also disabled/hidden for completed specs
- PUT /api/specs/:id returns an error (e.g., 403 or 409) if called for a completed spec
PASS CRITERIA: Editor is visually and functionally read-only; Locked badge visible; explanation text present; API rejects updates
EDGE CASE: A spec with only failed runs should remain editable (not locked)