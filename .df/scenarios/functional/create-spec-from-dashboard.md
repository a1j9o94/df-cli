---
name: create-spec-from-dashboard
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

SCENARIO: Create spec from dashboard UI
PRECONDITIONS: Dashboard is running, .df/specs/ directory exists, database has specs table
STEPS:
1. Open dashboard in browser
2. Locate and click 'New Spec' button in the sidebar header
3. In the creation modal/panel, type: 'Add a caching layer for the API responses'
4. Click submit/create button
5. Wait for spec generation to complete
EXPECTED RESULTS:
- A new .md file is created in .df/specs/ with filename pattern spec_<ULID>.md
- The file contains YAML frontmatter with: id (ULID), title (inferred from description), type: feature, status: draft, version: 0.1.0
- The file body contains: a Goal section populated from the description, a Requirements section with bullet list derived from the description, a Scenarios section with placeholders
- The spec appears in the database specs table with status 'draft'
- The spec appears in the sidebar spec list under the 'draft' group
- After generation, the spec opens in the inline markdown editor for refinement
PASS CRITERIA: File exists on disk with correct frontmatter and sections; spec visible in sidebar; editor opens automatically
API VERIFICATION: GET /api/specs returns the new spec with status 'draft' and a title