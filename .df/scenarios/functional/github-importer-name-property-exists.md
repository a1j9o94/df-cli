---
name: github-importer-name-property-exists
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSY17XRYR0TZDX4VKPD6AB7
---

Setup: Import GitHubImporter (or GitHubIssueImporter) class.\n\nSteps:\n1. Instantiate the GitHubImporter class\n2. Verify importer.name exists and equals 'github'\n3. Verify TypeScript compilation succeeds (IssueImporter interface requires name: string)\n4. Register the importer in ImporterRegistry\n5. Verify registry.getImporter('github') returns the importer\n\nPass criteria: The GitHub importer class MUST have a 'name' property set to 'github' to satisfy the IssueImporter interface contract. Without this, registry operations that depend on name (dedup check, getImporter) will fail.