---
name: add-discord-importer-follows-pattern
type: change
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJT3FJ9857ZNN5Q7BC43AX4V
---

Modification: Add a hypothetical --from-discord importer. Expected changes: 1. Create src/importers/discord/importer.ts implementing IssueImporter. 2. Create a stub or real importer in stubs.ts (or register a real class). 3. Register in createDefaultRegistry() in index.ts. 4. Add --from-discord flag in src/commands/spec/create.ts. Files that should NOT change: types.ts, registry.ts, spec-generator.ts, import-spec.ts, label-mapper.ts, github/importer.ts. Pass criteria: The existing importer registry pattern and spec generation pipeline must be generic enough that a completely new tracker type (not GitHub, Jira, or Linear) can be added following the same plug-in pattern with no changes to the core abstractions.