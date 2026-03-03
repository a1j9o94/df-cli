---
name: github-importer-registered-in-default-registry
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSY17XRYR0TZDX4VKPD6AB7
---

Setup: No special setup needed.\n\nSteps:\n1. Call createDefaultRegistry() from src/importers/index.ts\n2. Call registry.resolve('https://github.com/org/repo/issues/1')\n3. Verify the resolved importer is not null\n4. Verify the resolved importer has name property set to 'github'\n5. Verify registry.listImporters() includes 'github'\n\nPass criteria: The default registry MUST include a registered GitHubImporter that can resolve GitHub issue URLs. This catches integration gaps where the GitHub importer module exists but isn't registered in the default registry factory function.