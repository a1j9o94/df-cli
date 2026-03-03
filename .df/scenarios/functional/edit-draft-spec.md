---
name: edit-draft-spec
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Edit an existing draft spec in the inline editor.

PRECONDITIONS:
- Dark Factory project initialized
- Dashboard running
- At least one spec exists with status 'draft'
- The spec has a known requirements section with original content

STEPS:
1. Open dashboard
2. In the spec sidebar, click on an existing draft spec
3. Verify the main panel shows the spec content in a split view: raw markdown (left) and rendered preview (right)
4. In the raw markdown editor (left side), locate the '## Requirements' section
5. Add a new bullet: '- Support Redis and Memcached backends'
6. Click the Save button

EXPECTED RESULTS:
- The file on disk (.df/specs/<spec-id>.md) reflects the new requirement line
- The rendered preview (right side) updates to show the new bullet
- A 'saved' indicator appears after save
- The spec's updated_at timestamp in the database is updated
- GET /api/specs/:id returns the updated markdown content

AUTO-SAVE TEST:
7. Make another edit: add '- Add cache invalidation TTL config'
8. Wait 3+ seconds without clicking save
9. Verify the auto-save triggers (saved indicator appears)
10. Verify the file on disk reflects the auto-saved change

PASS CRITERIA:
- Manual save persists to disk immediately
- Auto-save triggers after 3s debounce
- Preview updates reflect edits
- Database record updated_at changes
- API returns updated content