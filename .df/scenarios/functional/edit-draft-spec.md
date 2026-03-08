---
name: edit-draft-spec
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Edit a draft spec in the inline editor
PRECONDITIONS: At least one spec exists with status 'draft' in .df/specs/ and the database
STEPS:
1. Open dashboard
2. Click on the draft spec in the sidebar to open it in the main panel
3. Verify the split view appears: raw markdown on left, rendered preview on right
4. Locate the Requirements section in the raw markdown editor
5. Add a new bullet point: '- Support cache invalidation via TTL headers'
6. Wait 3+ seconds for auto-save debounce to trigger
7. Verify 'saved' indicator appears
8. Alternatively, click the Save button manually
EXPECTED RESULTS:
- The .df/specs/<spec-id>.md file on disk now contains the new requirement line
- The rendered preview on the right updates to show the new bullet
- GET /api/specs/:id returns the updated markdown content
- The 'saved' indicator is visible after auto-save completes
- The spec remains in 'draft' status
PASS CRITERIA: File on disk matches editor content; preview renders correctly; auto-save triggers after 3s debounce; manual save also works
API VERIFICATION: PUT /api/specs/:id accepts the updated markdown and GET /api/specs/:id returns it