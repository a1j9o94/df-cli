---
name: add-new-importer-no-dead-code
type: change
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJT3FJ9857ZNN5Q7BC43AX4V
---

Modification: When adding a new importer (e.g., Jira, Linear), the developer should NOT have to reconcile duplicate implementation files. Currently there are two GitHub importer files: src/importers/github.ts (flat, unused) and src/importers/github/importer.ts (active, used by index.ts). The flat file is dead code that could confuse a developer adding a new importer. Pass criteria: Only ONE implementation file per importer should exist. A new importer developer should find a single, clear pattern to follow. Dead code files should not be present in the importers directory.