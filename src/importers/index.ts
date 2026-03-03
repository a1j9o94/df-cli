export type { IssueData, Comment, IssueImporter } from "./types.js";
export { ImporterRegistry } from "./registry.js";
export { GitHubIssueImporter } from "./github/importer.js";
export { mapLabels } from "./label-mapper.js";
export { generateSpecFromIssue } from "./spec-generator.js";
export { jiraStubImporter, linearStubImporter } from "./stubs.js";

import { ImporterRegistry } from "./registry.js";
import { GitHubIssueImporter } from "./github/importer.js";
import { jiraStubImporter, linearStubImporter } from "./stubs.js";

/**
 * Create the default importer registry with all built-in importers.
 * GitHub is fully functional; Jira and Linear are stubs.
 */
export function createDefaultRegistry(): ImporterRegistry {
  const registry = new ImporterRegistry();
  registry.register(new GitHubIssueImporter());
  registry.register(jiraStubImporter);
  registry.register(linearStubImporter);
  return registry;
}
