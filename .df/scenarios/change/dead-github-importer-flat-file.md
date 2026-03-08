---
name: dead-github-importer-flat-file
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NRZ2KMXYSHE6YA1PV0PC9
---

CHANGE SCENARIO: src/importers/github.ts (flat, 144 lines) is dead code - never imported. Only src/importers/github/importer.ts (GitHubIssueImporter) is used via index.ts. PASS CRITERIA: Only one GitHub importer implementation exists. FAIL CRITERIA: Two implementations exist, one is dead code creating confusion for new developers.