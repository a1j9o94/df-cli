---
name: cannot-edit-completed-spec
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Completed specs are immutable in the editor.

PRECONDITIONS:
- Dark Factory project initialized
- Dashboard running
- A spec exists with at least one completed run (all scenarios passed)
- This spec should have status that reflects completion

SETUP (if needed):
- Create a spec and manually set its status to completed in DB, or ensure a run with status 'completed' exists for the spec
- SQL: INSERT INTO runs (id, spec_id, status) VALUES ('run_test', '<spec-id>', 'completed')

STEPS:
1. Open dashboard
2. In the spec sidebar, identify the completed spec (should show a 'Locked' badge)
3. Click on the completed spec to open it in the main panel
4. Verify the editor fields are NON-EDITABLE (textarea should be disabled/readonly or contenteditable=false)
5. Verify a 'Locked' badge is visible on the spec
6. Verify explanation text is shown: 'This spec has a completed build. Create a new spec to make changes.'
7. Attempt to type in the editor - no changes should be accepted

EXPECTED RESULTS:
- Editor textarea/fields are readonly or disabled
- 'Locked' badge is visually prominent
- Explanation text is displayed
- No save button or build button visible for locked specs
- PUT /api/specs/:id should reject updates for completed specs (return 403 or 409)

PASS CRITERIA:
- UI prevents editing completed specs
- API rejects content updates to completed specs
- Visual indicators (badge + explanation) are present
- Spec file on disk is not modified