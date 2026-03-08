---
name: no-duplicate-github-importer-implementations
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK72R5ANW6X2DESTYMTFZJBE
---

Test: Only one GitHub importer implementation should exist in production code. Steps: 1. List all .ts files in src/importers/ that contain 'class.*Importer.*implements IssueImporter'. 2. Filter for files containing GitHub-related importer classes. 3. Verify exactly ONE file contains a GitHub importer class. Current state: src/importers/github.ts has GitHubImporter (143 lines, full features, dead code) and src/importers/github/importer.ts has GitHubIssueImporter (84 lines, incomplete). Only GitHubIssueImporter is imported by index.ts. Pass criteria: Exactly one GitHub importer implementation file exists in production code.