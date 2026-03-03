---
name: add-jira-importer
type: change
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Modification: Implement a --from-jira <url> flag that imports Jira issues into dark specs.\n\nExpected changes required:\n1. Create a new file src/importers/jira.ts implementing the IssueImporter interface with canHandle() matching Jira URLs and fetch() calling Jira REST API\n2. Register JiraImporter in the importer registry (src/importers/registry.ts) — one line addition\n3. Update CLI flag in src/commands/spec/create.ts to change --from-jira from 'not implemented' stub to active — one line change\n\nFiles that should NOT need changes:\n- src/importers/github.ts (existing GitHub importer unaffected)\n- src/importers/spec-mapper.ts (spec generation logic is importer-agnostic)\n- src/importers/types.ts (interfaces already defined)\n- Any pipeline, db, or utils files\n\nEstimated effort: 1 new file (~100 lines), 2 one-line changes in existing files.\n\nPass criteria: Adding a Jira importer requires NO changes to spec generation logic, NO changes to the GitHub importer, and NO changes to the core IssueImporter interface. Only: implement interface + register + activate CLI flag.