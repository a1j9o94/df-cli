---
name: add-spec-type-filter
type: change
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Modification: Add a 'bug / feature' filter to the timeline view, allowing users to filter displayed specs by their type field from the YAML frontmatter.

Change description: Add an optional query parameter ?type=feature or ?type=bug to GET /api/timeline. When present, only specs matching that type are included in all sections (summary, thisWeek, lastWeek, earlier, inProgress, planned). In the UI, add a filter dropdown in the Timeline tab header.

Affected areas:
1. API endpoint (server.ts): Add 'type' query parameter parsing, add WHERE clause to spec queries filtering by type
2. UI (index.ts): Add a <select> dropdown next to the 'Copy as Markdown' button, wire onChange to re-fetch /api/timeline?type=<selected>
3. No data model changes — specs already have a 'type' field in their YAML frontmatter (feature, bug, etc.)
4. CLI digest may optionally accept --type flag but not required

Expected effort: Medium — 2 files touched (server.ts for API filter, index.ts for dropdown UI). Estimated ~30-50 lines total. No schema migration needed.

Verification: Select 'feature' filter — only feature specs shown. Select 'bug' — only bug specs shown. Select 'all' — everything shown (default behavior).