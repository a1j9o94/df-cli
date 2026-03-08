---
name: add-jira-importer
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Changeability test: Adding a Jira importer should only require:
1. Creating a JiraImporter class implementing IssueImporter interface (canHandle, fetch, name)
2. Registering it in createDefaultRegistry() in src/importers/index.ts
3. The --from-jira CLI flag already exists in src/commands/spec/create.ts

Verification:
- No changes needed to spec-generator.ts
- No changes needed to import-spec.ts
- No changes needed to label-mapper.ts
- No changes needed to format-summary.ts
- No changes needed to the existing GitHubImporter
- The stubs.ts jiraStubImporter should be replaced by the real implementation in the registry

Expected effort: ~1 new file (jira-importer.ts), ~2 line change in index.ts to register it
Affected areas: src/importers/ only — no changes outside the importers directory except possibly removing the stub

Pass criteria: A new JiraImporter can be added by only: (a) implementing the IssueImporter interface, (b) registering in index.ts, (c) removing the stub. The spec generation pipeline remains unchanged.