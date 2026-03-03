---
name: create-spec-from-dashboard
type: functional
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Test: Create a new spec from the dashboard UI.

PRECONDITIONS:
- Dark Factory project initialized (dark init)
- Dashboard server running (dark dashboard)
- No existing specs required

STEPS:
1. Open dashboard in browser at http://localhost:<port>
2. Verify sidebar shows spec-centric view (not run-centric)
3. Locate and click 'New Spec' button in sidebar header
4. In the creation modal/panel, type: 'Add a caching layer for the API responses'
5. Click submit/create button

EXPECTED RESULTS:
- A new spec file is created in .df/specs/ directory
- The spec file contains valid YAML frontmatter with: id (spec_XXXX format), title derived from description, status: draft, type: feature, version: 0.1.0
- The spec body contains a '## Goal' section populated from the description text
- The spec body contains a '## Requirements' section with bullet-list requirements derived from the description
- The spec body contains a '## Scenarios' section (can be placeholder)
- The spec is registered in the SQLite database (specs table) with status 'draft'
- After creation, the spec opens in the inline editor for refinement

VERIFICATION:
- Check .df/specs/ directory for new file: ls .df/specs/*.md
- Read the new spec file and verify frontmatter and sections
- Query DB: SELECT * FROM specs WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1
- Verify API: GET /api/specs should list the new spec
- Verify API: GET /api/specs/:id should return the full markdown content